# Google Drive Bulk Workflow

ဒီ guide က `အောင်လက်မှတ် စုစုပေါင်း` folder ထဲက ဖိုင်တွေကို bulk map လုပ်ပြီး app ထဲသို့ link ချိတ်ရန်အတွက်ပါ။

## အချက်အလက်

- `firebase-adminsdk-fbsvc@mks-certificate-app-cbf64.iam.gserviceaccount.com` ကို shared folder ရဲ့ root folder ထဲမှာ `Viewer` သို့ `Editor` ပေးထားရပါမယ်။
- preview သာလိုရင် `Viewer` လုံလောက်ပါတယ်။
- file upload လုပ်မယ်ဆိုရင် upload folder ကို `Editor` ပေးပါ။

## တစ်ဆင့်ချင်း

### 1) Drive folder ကို scan ထုတ်ပါ

အရင်ဆုံး Drive folder ထဲက file list ကို Excel file အဖြစ်ထုတ်ပါ။

```bash
pnpm run drive:scan -- --drive-folder-name="အောင်လက်မှတ် စုစုပေါင်း"
```

Drive API က project ထဲမှာ enable မဖြစ်သေးရင် local synced folder ကို scan လုပ်ပါ။

```bash
pnpm run drive:scan-local -- --local-root-path="D:\MKS\အောင်လက်မှတ် စုစုပေါင်း"
```

Output file:

- `outputs/drive-scan/Google_Drive_File_Scan.xlsx`
- `outputs/local-scan/Local_File_Mapping.xlsx`

### 2) Workbook ကိုဖွင့်ပြီး review လုပ်ပါ

ဖိုင်တစ်ကြောင်းစီမှာ အောက်ကအချက်တွေကိုစစ်ပါ။

- `drive_file_id`
- `drive_link`
- `drive_file_name`
- `drive_folder_path`

လိုရင် `seat_no`, `student_name`, `academic_year` ကို manual ဖြည့်ပါ။

### 3) Dry-run import လုပ်ပါ

Firestore ထဲ update မလုပ်ခင် စမ်းကြည့်ပါ။

```bash
pnpm run drive:import -- --workbook="outputs/drive-scan/Google_Drive_File_Scan.xlsx" --dry-run
```

### 4) Real import လုပ်ပါ

Dry-run အဆင်ပြေမှသာ real import လုပ်ပါ။

```bash
pnpm run drive:import -- --workbook="outputs/drive-scan/Google_Drive_File_Scan.xlsx"
```

## အရေးကြီး

- `drive_link` မရှိသေးရင် `drive_file_id` တင်ထားလည်းရတယ်။
- record matching အတွက် `seat_no + student_name + academic_year` သို့ `app_document_id` ကို သုံးပါတယ်။
- file မတွေ့ရင် folder share မပြည့်စုံသေးတာ ဖြစ်နိုင်ပါတယ်။

## အကြံပြု workflow

1. `drive:scan` နဲ့ file list ထုတ်ပါ
   - အလုပ်မလုပ်ရင် `drive:scan-local` ကိုသုံးပါ
2. workbook ထဲမှာ missing fields ဖြည့်ပါ
3. `drive:import --dry-run` နဲ့စစ်ပါ
4. `drive:import` နဲ့တင်ပါ
5. preview မပေါ်သေးရင် share permission ကိုပြန်စစ်ပါ
