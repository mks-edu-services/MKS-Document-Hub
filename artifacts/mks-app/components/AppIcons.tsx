import { Feather as ExpoFeather, MaterialIcons as ExpoMaterialIcons } from "@expo/vector-icons";
import React from "react";
import { Platform } from "react-native";
import {
  AlertCircle,
  AlertTriangle,
  BadgeCheck,
  BookOpen,
  Briefcase,
  Calendar,
  Camera,
  Check,
  CircleAlert,
  CircleCheck,
  CircleHelp,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock,
  CloudOff,
  CloudUpload,
  Download,
  Edit2,
  ExternalLink,
  Eye,
  EyeOff,
  EllipsisVertical,
  FilePlus,
  FileText,
  Funnel,
  Grid2x2,
  Home,
  Inbox,
  Info,
  Image as ImageIcon,
  Languages,
  LayoutGrid,
  Link,
  List,
  Lock,
  LogOut,
  Mail,
  Menu,
  Plus,
  RefreshCw,
  Save,
  School,
  Search,
  Settings,
  Shield,
  SlidersHorizontal,
  SquarePen,
  SquarePlus,
  Trash,
  Trash2,
  Upload,
  User,
  UserCircle2,
  Users,
  X,
} from "lucide-react";

type IconProps = {
  name: string;
  size?: number;
  color?: string;
  style?: any;
};

const webIconAliases: Record<string, string> = {
  "alert-circle": "circle-alert",
  "alert-triangle": "triangle-alert",
  "admin-panel-settings": "settings",
  book: "book",
  "book-open": "book-open",
  briefcase: "briefcase",
  calendar: "calendar",
  camera: "camera",
  check: "check",
  "check-circle": "circle-check",
  "chevron-down": "chevron-down",
  "chevron-right": "chevron-right",
  "chevron-up": "chevron-up",
  clock: "clock",
  "cloud-off": "cloud-off",
  "cloud-upload": "cloud-upload",
  description: "file-text",
  download: "download",
  "edit-2": "edit-2",
  edit: "edit",
  "external-link": "external-link",
  eye: "eye",
  "eye-off": "eye-off",
  filter: "funnel",
  "file-plus": "file-plus",
  "file-text": "file-text",
  home: "home",
  inbox: "inbox",
  info: "info",
  image: "image",
  layout: "layout-grid",
  link: "link",
  lock: "lock",
  "log-out": "log-out",
  mail: "mail",
  menu: "menu",
  plus: "plus",
  "plus-square": "square-plus",
  save: "save",
  school: "school",
  search: "search",
  settings: "settings",
  shield: "shield",
  sliders: "sliders-horizontal",
  "trash-2": "trash-2",
  trash: "trash",
  translate: "languages",
  user: "user",
  users: "users",
  verified: "badge-check",
  "view-list": "list",
  "more-vertical": "ellipsis-vertical",
  x: "x",
};

const reportedWebIcons = new Set<string>();

function resolveWebIconName(name: string) {
  return webIconAliases[name] ?? name;
}

const webIconComponents: Record<string, React.ComponentType<any>> = {
  "alert-circle": AlertCircle,
  "alert-triangle": AlertTriangle,
  "admin-panel-settings": Settings,
  book: BookOpen,
  "book-open": BookOpen,
  briefcase: Briefcase,
  calendar: Calendar,
  camera: Camera,
  check: Check,
  "check-circle": CircleCheck,
  "chevron-down": ChevronDown,
  "chevron-right": ChevronRight,
  "chevron-up": ChevronUp,
  clock: Clock,
  "cloud-off": CloudOff,
  "cloud-upload": CloudUpload,
  description: FileText,
  download: Download,
  "edit-2": Edit2,
  edit: SquarePen,
  "external-link": ExternalLink,
  eye: Eye,
  "eye-off": EyeOff,
  filter: Funnel,
  "file-plus": FilePlus,
  "file-text": FileText,
  home: Home,
  inbox: Inbox,
  info: Info,
  image: ImageIcon,
  layout: LayoutGrid,
  link: Link,
  lock: Lock,
  "log-out": LogOut,
  mail: Mail,
  menu: Menu,
  plus: Plus,
  "plus-square": SquarePlus,
  save: Save,
  school: School,
  search: Search,
  settings: Settings,
  shield: Shield,
  sliders: SlidersHorizontal,
  "trash-2": Trash2,
  trash: Trash,
  upload: Upload,
  translate: Languages,
  user: User,
  "user-circle": UserCircle2,
  "user-circle-2": UserCircle2,
  users: Users,
  verified: BadgeCheck,
  "view-list": List,
  x: X,
  "refresh-cw": RefreshCw,
  "circle-check": CircleCheck,
  "circle-alert": CircleAlert,
  funnel: Funnel,
  "square-pen": SquarePen,
  "insert-drive-file": FileText,
  "circle-question-mark": CircleHelp,
  "view-module": Grid2x2,
  "more-vertical": EllipsisVertical,
};

function createIconComponent(
  ExpoIcon: React.ComponentType<any>,
  fallbacks: Record<string, string> = {},
) {
  const Icon = ({ name, size = 16, color = "#000", style, ...rest }: IconProps & Record<string, unknown>) => {
    if (Platform.OS === "web") {
      const resolvedName = resolveWebIconName(name);
      const WebIcon = webIconComponents[resolvedName] ?? CircleHelp;
      if (!webIconComponents[resolvedName] && !reportedWebIcons.has(resolvedName)) {
        reportedWebIcons.add(resolvedName);
        console.warn(
          `[AppIcons] Unknown web icon "${name}" mapped to "${resolvedName}". Falling back to circle-question-mark.`,
        );
      }
      return <WebIcon size={size} color={color} style={style} {...(rest as Record<string, unknown>)} />;
    }

    return <ExpoIcon name={(fallbacks[name] ?? name) as never} size={size} color={color} style={style} {...rest} />;
  };

  return Object.assign(Icon, {
    font: (ExpoIcon as any).font,
    glyphMap: (ExpoIcon as any).glyphMap,
  });
}

export const Feather = createIconComponent(ExpoFeather);
export const MaterialIcons = createIconComponent(ExpoMaterialIcons);
