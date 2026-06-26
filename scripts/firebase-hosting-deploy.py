from __future__ import annotations

import gzip
import hashlib
import json
import os
import pathlib
import time
import urllib.error
import urllib.parse
import urllib.request
import sys
from dataclasses import dataclass


@dataclass
class FileEntry:
    relative: str
    gzipped: bytes
    sha256: str


def read_json(path: str):
    return json.loads(pathlib.Path(path).read_text(encoding="utf-8"))


def log(message: str):
    try:
        print(message)
        sys.stdout.flush()
    except OSError:
        pass


def transform_hosting_config(firebase_json: dict):
    hosting = firebase_json.get("hosting")
    if isinstance(hosting, list):
      hosting = hosting[0] if hosting else None
    if not hosting:
        raise RuntimeError("firebase.json is missing a hosting configuration.")

    config: dict = {}
    if isinstance(hosting.get("headers"), list):
        config["headers"] = [
            {
                "glob": entry.get("source"),
                "headers": {header.get("key"): header.get("value") for header in entry.get("headers", [])},
            }
            for entry in hosting["headers"]
        ]
    if isinstance(hosting.get("redirects"), list):
        config["redirects"] = [
            {
                "glob": entry.get("source"),
                "statusCode": 302 if entry.get("type") == "temporary" else 301 if entry.get("type") == "permanent" else entry.get("statusCode"),
                "location": entry.get("destination"),
            }
            for entry in hosting["redirects"]
        ]
    if isinstance(hosting.get("rewrites"), list):
        config["rewrites"] = [
            {
                "glob": entry.get("source"),
                "path": entry.get("destination"),
            }
            for entry in hosting["rewrites"]
        ]
    if isinstance(hosting.get("cleanUrls"), bool):
        config["cleanUrls"] = hosting["cleanUrls"]
    if isinstance(hosting.get("trailingSlash"), str):
        config["trailingSlashBehavior"] = "REMOVE" if hosting["trailingSlash"] == "REMOVE" else "ADD"
    return config


def request_json(url: str, method: str = "GET", headers: dict | None = None, body: bytes | str | dict | None = None, timeout: int = 60, retries: int = 4):
    headers = dict(headers or {})
    data: bytes | None
    if body is None:
        data = None
    elif isinstance(body, bytes):
        data = body
    elif isinstance(body, str):
        data = body.encode("utf-8")
    else:
        data = json.dumps(body).encode("utf-8")
        headers.setdefault("Content-Type", "application/json")

    last_error: Exception | None = None
    for attempt in range(1, retries + 1):
        try:
            request = urllib.request.Request(url, data=data, headers=headers, method=method)
            with urllib.request.urlopen(request, timeout=timeout) as response:
                text = response.read().decode("utf-8")
                payload = json.loads(text) if text else {}
                return response.status, payload
        except Exception as error:  # pragma: no cover - network path
            last_error = error
            if attempt == retries or not is_retryable(error):
                raise
            time.sleep(attempt * 2)
    raise last_error or RuntimeError("request failed")


def is_retryable(error: Exception):
    if isinstance(error, (TimeoutError, ConnectionError)):
        return True
    if isinstance(error, urllib.error.URLError):
        return True
    message = str(error).lower()
    return any(token in message for token in ("timeout", "timed out", "tempor", "connection reset", "network is unreachable", "fetch failed"))


def mint_access_token(assertion: str):
    body = urllib.parse.urlencode(
        {
            "grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer",
            "assertion": assertion,
        }
    )
    status, payload = request_json(
        "https://oauth2.googleapis.com/token",
        method="POST",
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        body=body,
        timeout=75,
        retries=8,
    )
    if status != 200:
        raise RuntimeError(f"Failed to mint access token: {status} {payload}")
    return payload["access_token"]


def collect_files(root_dir: str):
    entries: list[FileEntry] = []
    root_path = pathlib.Path(root_dir)
    for file_path in sorted(root_path.rglob("*")):
        if not file_path.is_file():
            continue
        relative = "/" + file_path.relative_to(root_path).as_posix()
        raw = file_path.read_bytes()
        gzipped = gzip.compress(raw)
        sha256 = hashlib.sha256(gzipped).hexdigest()
        entries.append(FileEntry(relative=relative, gzipped=gzipped, sha256=sha256))
    return entries


def upload_file(access_token: str, upload_url: str, file_hash: str, contents: bytes):
    status, _payload = request_json(
        f"{upload_url}/{file_hash}",
        method="POST",
        headers={
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/octet-stream",
        },
        body=contents,
        timeout=60,
        retries=4,
    )
    if status not in (200, 201, 204):
        raise RuntimeError(f"Upload failed for {file_hash}: {status}")


def main():
    site_id = os.environ["FIREBASE_SITE_ID"]
    firebase_config_path = os.environ["FIREBASE_CONFIG_PATH"]
    dist_dir = os.environ["DEPLOY_DIST_DIR"]
    assertion = os.environ["FIREBASE_ASSERTION"]

    firebase_json = read_json(firebase_config_path)
    hosting_config = transform_hosting_config(firebase_json)
    access_token = mint_access_token(assertion)

    log("Minted Firebase access token.")

    status, version = request_json(
        f"https://firebasehosting.googleapis.com/v1beta1/sites/{site_id}/versions",
        method="POST",
        headers={"Authorization": f"Bearer {access_token}"},
        body={"config": hosting_config},
        timeout=60,
    )
    if status != 200:
        raise RuntimeError(f"Create version failed: {status} {version}")
    log(f"Created Firebase Hosting version: {version['name']}")

    files = collect_files(dist_dir)
    file_map = {file.relative: file.sha256 for file in files}

    version_name = version["name"]
    version_id = version_name.split("/")[-1]
    status, population = request_json(
        f"https://firebasehosting.googleapis.com/v1beta1/sites/{site_id}/versions/{version_id}:populateFiles",
        method="POST",
        headers={"Authorization": f"Bearer {access_token}"},
        body={"files": file_map},
        timeout=60,
    )
    if status != 200:
        raise RuntimeError(f"Populate files failed: {status} {population}")

    required_hashes = set(population.get("uploadRequiredHashes", []))
    upload_url = population["uploadUrl"]
    log(f"Uploading {len(required_hashes)} file blobs...")
    uploaded = 0
    for index, file in enumerate(files, start=1):
        if file.sha256 not in required_hashes:
            continue
        upload_file(access_token, upload_url, file.sha256, file.gzipped)
        uploaded += 1
        if uploaded % 25 == 0 or uploaded == len(required_hashes):
            log(f"Uploaded {uploaded}/{len(required_hashes)} file blobs...")

    status, finalized = request_json(
        f"https://firebasehosting.googleapis.com/v1beta1/{version_name}?update_mask=status",
        method="PATCH",
        headers={"Authorization": f"Bearer {access_token}"},
        body={"status": "FINALIZED"},
        timeout=60,
    )
    if status != 200:
        raise RuntimeError(f"Finalize version failed: {status} {finalized}")
    log("Finalized Firebase Hosting version.")

    status, release = request_json(
        f"https://firebasehosting.googleapis.com/v1beta1/sites/{site_id}/releases?versionName={urllib.parse.quote(version_name, safe='')}",
        method="POST",
        headers={"Authorization": f"Bearer {access_token}"},
        body={},
        timeout=60,
    )
    if status != 200:
        raise RuntimeError(f"Create release failed: {status} {release}")

    log(f"Deployed release: {release['name']}")
    log(f"Live site: https://{site_id}.web.app")


if __name__ == "__main__":
    main()
