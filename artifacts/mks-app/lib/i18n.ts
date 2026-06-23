import { LanguageCode, DocumentStatus, FieldType } from "@/types";

export const DEFAULT_LANGUAGE: LanguageCode = "my";
export const LANGUAGE_STORAGE_KEY = "mks_document_hub_language";

const TEXT = {
  appName: { my: "MKS Document Hub", en: "MKS Document Hub" },
  language: { my: "ဘာသာစကား", en: "Language" },
  all: { my: "အားလုံး", en: "All" },
  burmese: { my: "မြန်မာ", en: "Burmese" },
  english: { my: "အင်္ဂလိပ်", en: "English" },
  dashboard: { my: "ဒက်ရှ်ဘုတ်", en: "Dashboard" },
  documents: { my: "မှတ်တမ်းများ", en: "Documents" },
  search: { my: "ရှာဖွေရန်", en: "Search" },
  profile: { my: "ပရိုဖိုင်", en: "Profile" },
  admin: { my: "အက်ဒမင်", en: "Admin" },
  editor: { my: "အယ်ဒီတာ", en: "Editor" },
  viewer: { my: "ကြည့်ရှုသူ", en: "Viewer" },
  templates: { my: "တမ်းပလိတ်များ", en: "Templates" },
  welcomeBack: { my: "ပြန်လည်ကြိုဆိုပါတယ်", en: "Welcome Back" },
  signIn: { my: "ဝင်ရောက်ရန်", en: "Sign In" },
  createAccount: { my: "အကောင့်အသစ် ဖန်တီးရန်", en: "Create Account" },
  documentManagementSystem: { my: "စာရွက်စာတမ်း စီမံခန့်ခွဲမှုစနစ်", en: "Document Management System" },
  signInToAccessDocuments: { my: "စာရွက်စာတမ်းများကို ကြည့်ရန် ဝင်ရောက်ပါ", en: "Sign in to access your documents" },
  registerToGetStarted: { my: "စတင်အသုံးပြုရန် အကောင့်ဖွင့်ပါ", en: "Register to get started" },
  emailAddress: { my: "အီးမေးလ်လိပ်စာ", en: "Email Address" },
  password: { my: "စကားဝှက်", en: "Password" },
  fullName: { my: "နာမည်အပြည့်အစုံ", en: "Full Name" },
  yourFullName: { my: "သင့်နာမည်အပြည့်အစုံ", en: "Your full name" },
  enterPassword: { my: "စကားဝှက်ထည့်ပါ", en: "Enter your password" },
  alreadyHaveAccountSignIn: { my: "အကောင့်ရှိပြီးသားလား? ဝင်ရောက်ပါ", en: "Already have an account? Sign in" },
  createNewAccount: { my: "အကောင့်အသစ် ဖန်တီးရန်", en: "Create a new account" },
  fieldRequired: { my: "လိုအပ်သော အကွက်များအားလုံး ဖြည့်ပါ", en: "Please fill in all required fields." },
  fullNameRequired: { my: "နာမည်အပြည့်အစုံ ထည့်ပါ", en: "Please enter your full name." },
  invalidEmailOrPassword: { my: "အီးမေးလ် သို့မဟုတ် စကားဝှက် မမှန်ပါ", en: "Invalid email or password." },
  emailAlreadyRegistered: { my: "ဤအီးမေးလ်ကို အကောင့်ဖွင့်ပြီးသားပါ", en: "This email is already registered." },
  passwordTooShort: { my: "စကားဝှက်သည် အနည်းဆုံး စာလုံး ၆ လုံးရှိရမည်", en: "Password must be at least 6 characters." },
  loginFooter: { my: "MKS Education Service © 2025", en: "MKS Education Service © 2025" },
  dashboardGreetingMorning: { my: "မင်္ဂလာနံနက်ခင်း", en: "Good morning" },
  dashboardGreetingAfternoon: { my: "မင်္ဂလာနေ့လယ်", en: "Good afternoon" },
  dashboardGreetingEvening: { my: "မင်္ဂလာညချမ်း", en: "Good evening" },
  quickAdd: { my: "အမြန်ထည့်ရန်", en: "Quick Add" },
  recentDocuments: { my: "မကြာသေးမီက မှတ်တမ်းများ", en: "Recent Documents" },
  serial: { my: "စဉ်", en: "No." },
  seeAll: { my: "အားလုံးကြည့်ရန်", en: "See all" },
  noDocumentsYet: { my: "မှတ်တမ်းမရှိသေးပါ", en: "No documents yet" },
  noDocumentsFound: { my: "မှတ်တမ်းမတွေ့ပါ", en: "No documents found" },
  loading: { my: "ဖတ်နေသည်...", en: "Loading..." },
  createYourFirstDocument: { my: "ပထမဆုံးမှတ်တမ်းကို စတင်ဖန်တီးပါ", en: "Create your first document to get started" },
  configureFirebase: { my: "Firebase ကို ချိတ်ဆက်ပြီးမှ မှတ်တမ်းသိမ်းနိုင်ပါမည်", en: "Configure Firebase to store documents" },
  tryAdjustFilters: { my: "Filter များကို ပြန်ညှိကြည့်ပါ", en: "Try adjusting your filters" },
  searchPlaceholder: { my: "ခုံနံပါတ်၊ နာမည်၊ ဖိုင်နာမည်… ရှာရန်", en: "Search by seat no, name, or file name..." },
  searchDocumentsStudentsSchools: { my: "မှတ်တမ်း၊ ကျောင်းသား၊ ကျောင်းများ ရှာဖွေရန်", en: "Search documents, students, schools" },
  serviceType: { my: "ဝန်ဆောင်မှုအမျိုးအစား", en: "Service Type" },
  school: { my: "ကျောင်း / အဖွဲ့အစည်း", en: "School / Institution" },
  academicYear: { my: "ပညာသင်နှစ်", en: "Academic Year" },
  agent: { my: "ကိုယ်စားလှယ် / ဆောင်ရွက်သူ", en: "Agent / Processed By" },
  date: { my: "ရက်စွဲ", en: "Date" },
  title: { my: "ခေါင်းစဉ်", en: "Title" },
  studentName: { my: "ကျောင်းသားအမည်", en: "Student Name" },
  documentDetails: { my: "မှတ်တမ်းအသေးစိတ်", en: "Document Details" },
  additionalFields: { my: "နောက်ထပ်အချက်အလက်များ", en: "Additional Fields" },
  registryInformation: { my: "စာရင်းအချက်အလက်", en: "Registry Information" },
  clickFieldsToEdit: { my: "အောက်ကကွက်တွေကိုနှိပ်ပြီး တိုက်ရိုက်ပြင်နိုင်ပါတယ်", en: "Tap any field below to edit it directly." },
  notes: { my: "မှတ်ချက်", en: "Notes" },
  tracking: { my: "လိုက်လံမှတ်တမ်း", en: "Tracking" },
  created: { my: "ဖန်တီးသည့်နေ့", en: "Created" },
  lastUpdated: { my: "နောက်ဆုံးပြင်သည့်နေ့", en: "Last Updated" },
  driveSync: { my: "Google Drive ချိတ်ဆက်မှု", en: "Drive Sync" },
  currentStatus: { my: "လက်ရှိအခြေအနေ", en: "Current Status" },
  deleteDocument: { my: "မှတ်တမ်းဖျက်ရန်", en: "Delete Document" },
  editDocument: { my: "မှတ်တမ်းပြင်ရန်", en: "Edit Document" },
  changeStatus: { my: "အခြေအနေပြောင်းရန်", en: "Change Status" },
  uploadToDrive: { my: "Google Drive သို့တင်ရန်", en: "Upload to Google Drive" },
  retryGoogleDriveSync: { my: "Google Drive ပြန်စမ်းရန်", en: "Retry Google Drive Sync" },
  linkedGoogleDoc: { my: "Google Doc ချိတ်ထားပြီး", en: "Linked Google Doc" },
  drivePending: { my: "Google Drive မတင်ရသေးပါ", en: "Drive pending" },
  driveSynced: { my: "Google Drive သို့တင်ပြီး", en: "Drive synced" },
  driveFailed: { my: "Google Drive တင်ခြင်း မအောင်မြင်", en: "Drive failed" },
  driveUploadFailed: { my: "Google Drive သို့တင်ခြင်း မအောင်မြင်ပါ", en: "Failed to upload to Google Drive." },
  googleDriveLink: { my: "Google Drive လင့်ခ်", en: "Google Drive Link" },
  driveLinkHint: { my: "Drive မှ Copy link to clipboard ဖြင့်ယူထားတဲ့ link ကို paste လုပ်ပါ။", en: "Paste the link copied from Google Drive using \"Copy link to clipboard\"." },
  driveConnected: { my: "Google Drive ချိတ်ဆက်ထားသည်", en: "Drive connected" },
  driveReady: { my: "Uploads will use the configured Drive folder.", en: "Uploads will use the configured Drive folder." },
  driveFolderMissing: { my: "Drive ချိတ်ဆက်ပြီးသော်လည်း ပစ်မှတ် folder မသတ်မှတ်ရသေးပါ။ Upload များက Drive root သို့သွားမည်။", en: "Drive is connected, but no target folder is set. Uploads will go to the Drive root." },
  driveMissingConnector: { my: "Google Drive connector မချိတ်ဆက်ရသေးပါ။ Admin ထံမှ Google account ချိတ်ရန် တောင်းဆိုပါ။", en: "Google Drive is not connected yet. Ask an admin to link the Google account before uploading." },
  driveApiNotConfigured: { my: "Backend API URL မသတ်မှတ်ရသေးပါ။ Google Drive status ကို စစ်မရသေးပါ။", en: "The backend API URL is not configured yet, so Drive status cannot be checked." },
  driveHealthChecking: { my: "Google Drive status ကို စစ်ဆေးနေပါသည်…", en: "Checking Google Drive status…" },
  driveHealthUnavailable: { my: "Google Drive status မစစ်နိုင်သေးပါ", en: "Unable to check Google Drive status" },
  driveHealthCheckFailed: { my: "Google Drive status ကို လောလောဆယ် မစစ်ဆေးနိုင်ပါ။", en: "Unable to check Google Drive status right now." },
  refreshDriveStatus: { my: "ပြန်စစ်ရန်", en: "Refresh" },
  driveTools: { my: "Google Drive Excel", en: "Google Drive Excel" },
  driveExcelMenu: { my: "Drive Excel ကို စီမံရန်", en: "Manage Drive Excel" },
  driveExcelHelp: { my: "Template ကို download လုပ်ပြီး၊ fill လုပ်ပြီး import ပြန်တင်နိုင်ပါတယ်။ Current records ကို export လုပ်ပြီးလည်း link များကို manual ဖြည့်နိုင်ပါတယ်။", en: "Download a template, fill it in, and import it back. You can also export current records and fill links manually." },
  driveExcelGuide: { my: "Column Guide", en: "Column Guide" },
  downloadDriveTemplate: { my: "Template Download", en: "Download Template" },
  exportDriveWorkbook: { my: "Current Records Export", en: "Export Current Records" },
  importDriveWorkbook: { my: "Workbook Import", en: "Import Workbook" },
  driveImportHint: { my: "Import လုပ်တဲ့အခါ app_document_id ကို အရင်သုံးပါမယ်။ မရှိရင် ခုံနံပါတ် + နာမည် + ပညာသင်နှစ် ကိုက်ညီမှုနဲ့ ဆက်ပါမယ်။", en: "Import prefers app_document_id first. If missing, it matches by seat number + name + academic year." },
  driveImportDone: { my: "Import ပြီးပါပြီ", en: "Import completed" },
  driveImportSummary: { my: "Import Summary", en: "Import Summary" },
  updated: { my: "ပြင်ပြီး", en: "Updated" },
  skipped: { my: "ကျော်သွား", en: "Skipped" },
  unmatched: { my: "မကိုက်ညီ", en: "Unmatched" },
  ambiguous: { my: "မရှင်းလင်း", en: "Ambiguous" },
  registrySummaryHint: { my: "စာရင်းအချက်အလက်တွေကို အောက်မှာ field တစ်ခုချင်းစီအလိုက် ပြင်နိုင်ပါတယ်။", en: "Edit registry details field by field below." },
  trackingSummaryHint: { my: "ဖန်တီးသည့်နေ့၊ နောက်ဆုံးပြင်သည့်နေ့၊ Google Drive ချိတ်ဆက်မှု၊ Drive အမှား နှင့် လက်ရှိအခြေအနေကို ဒီမှာကြည့်နိုင်ပါတယ်။", en: "View created date, last updated date, Drive link status, Drive errors, and current status here." },
  templateInfo: { my: "တမ်းပလိတ်အချက်အလက်", en: "Template Info" },
  howThisTemplateWorks: { my: "ဒီ template က ဘယ်လိုအလုပ်လုပ်သလဲ", en: "How this template works" },
  templateName: { my: "တမ်းပလိတ်အမည်", en: "Template Name" },
  description: { my: "ဖော်ပြချက်", en: "Description" },
  customFields: { my: "စိတ်ကြိုက်ကွက်များ", en: "Custom Fields" },
  addField: { my: "ကွက်ထည့်ရန်", en: "Add Field" },
  field: { my: "ကွက်", en: "Field" },
  required: { my: "မဖြစ်မနေဖြည့်ရန်", en: "Required" },
  selectOptions: { my: "ရွေးချယ်စရာများ", en: "Select Options" },
  fieldLabel: { my: "ကွက်အမည်", en: "Field Label" },
  placeholderText: { my: "Placeholder စာသား", en: "Placeholder text" },
  createTemplate: { my: "တမ်းပလိတ်ဖန်တီးရန်", en: "Create Template" },
  updateTemplate: { my: "တမ်းပလိတ်ပြင်ရန်", en: "Update Template" },
  active: { my: "Active", en: "Active" },
  draft: { my: "Draft", en: "Draft" },
  archived: { my: "Archived", en: "Archived" },
  total: { my: "စုစုပေါင်း", en: "Total" },
  drafts: { my: "Drafts", en: "Drafts" },
  myDocs: { my: "ကျွန်ုပ်၏မှတ်တမ်း", en: "My Docs" },
  newDocument: { my: "မှတ်တမ်းအသစ်", en: "New Document" },
  exportReport: { my: "အစီရင်ခံစာထုတ်ရန်", en: "Export Report" },
  report: { my: "အစီရင်ခံစာ", en: "Report" },
  scanCertificate: { my: "Scan ဖိုင်", en: "Scan File" },
  linkScan: { my: "Scan ဖိုင်ချိတ်ရန်", en: "Link Scan File" },
  scanSearchPlaceholder: { my: "ခုံနံပါတ် / အမည် / ဖိုင်နာမည်ဖြင့်ရှာရန်", en: "Search by seat number / name / file name" },
  attach: { my: "ချိတ်ရန်", en: "Attach" },
  preview: { my: "ကြိုကြည့်ရန်", en: "Preview" },
  searchResults: { my: "ရှာဖွေတွေ့ရှိချက်များ", en: "Search Results" },
  noScanResults: { my: "ကိုက်ညီသော scan ဖိုင်မတွေ့ပါ", en: "No matching scan files found" },
  scanLinked: { my: "Scan ဖိုင်ချိတ်ပြီး", en: "Scan linked" },
  scanNotLinked: { my: "Scan ဖိုင်မချိတ်ရသေး", en: "Scan not linked" },
  memberSince: { my: "ပူးပေါင်းစတင်ခဲ့သည့်အချိန်", en: "Member since" },
  signOut: { my: "ထွက်ရန်", en: "Sign Out" },
  passwordHelp: { my: "စကားဝှက်ကို ထည့်ပါ", en: "Enter your password" },
  dashboardTotal: { my: "စုစုပေါင်း", en: "Total" },
  dashboardActive: { my: "Active", en: "Active" },
  dashboardTemplates: { my: "တမ်းပလိတ်များ", en: "Templates" },
  dashboardDrafts: { my: "Drafts", en: "Drafts" },
  error: { my: "အမှားဖြစ်နေပါသည်", en: "Error" },
  failedToUpdateName: { my: "နာမည်ပြင်ဆင်၍ မရပါ", en: "Failed to update name." },
  failedToUpdateAgentName: { my: "Agent အမည်ပြင်ဆင်၍ မရပါ", en: "Failed to update agent name." },
  failedToUpdateProfilePhoto: { my: "Profile ပုံ ပြင်ဆင်၍ မရပါ", en: "Failed to update profile photo." },
  signOutConfirm: { my: "ထွက်ရန် သေချာပါသလား?", en: "Are you sure you want to sign out?" },
  profileInformation: { my: "ပရိုဖိုင်အချက်အလက်", en: "Profile Information" },
  account: { my: "အကောင့်", en: "Account" },
  displayName: { my: "နာမည်", en: "Display Name" },
  username: { my: "အသုံးပြုသူအမည်", en: "Username" },
  phoneNumber: { my: "ဖုန်းနံပါတ်", en: "Phone Number" },
  agentName: { my: "Agent အမည်", en: "Agent Name" },
  tapAvatarToChangePhoto: { my: "ပုံပြောင်းရန် avatar ကို နှိပ်ပါ", en: "Tap the avatar to change your photo." },
  role: { my: "အခန်းကဏ္ဍ", en: "Role" },
  accessStatus: { my: "အသုံးပြုခွင့်", en: "Access Status" },
  allow: { my: "ခွင့်ပြု", en: "Allow" },
  deny: { my: "ပယ်ဖျက်", en: "Deny" },
  allowed: { my: "ခွင့်ပြုပြီး", en: "Allowed" },
  denied: { my: "ပယ်ဖျက်ပြီး", en: "Denied" },
  pending: { my: "စောင့်ဆိုင်း", en: "Pending" },
  saveChanges: { my: "ပြင်ဆင်ချက် သိမ်းရန်", en: "Save Changes" },
  createUser: { my: "အသုံးပြုသူ ဖန်တီးရန်", en: "Create User" },
  editUser: { my: "အသုံးပြုသူ ပြင်ရန်", en: "Edit User" },
  deleteUser: { my: "အသုံးပြုသူ ဖျက်ရန်", en: "Delete User" },
  currentUser: { my: "လက်ရှိအသုံးပြုသူ", en: "Current User" },
  accessDeniedMessage: { my: "အသုံးပြုခွင့် ပိတ်သွားပါပြီ။", en: "Access has been denied." },
  userManagement: { my: "အသုံးပြုသူ စီမံခန့်ခွဲမှု", en: "User Management" },
  newUser: { my: "အသုံးပြုသူအသစ်", en: "New User" },
  confirmPassword: { my: "စကားဝှက် ထပ်ထည့်ပါ", en: "Confirm Password" },
  accountCreated: { my: "အကောင့်ဖန်တီးပြီး", en: "Account created" },
  accountUpdated: { my: "အကောင့်ပြင်ပြီး", en: "Account updated" },
  accountDenied: { my: "အသုံးပြုခွင့်ပိတ်ပြီး", en: "Access denied" },
  accountDeleted: { my: "အကောင့်ဖျက်ပြီး", en: "Account deleted" },
  notSupportedYet: { my: "လောလောဆယ် မပံ့ပိုးသေးပါ", en: "Not supported yet" },
  email: { my: "အီးမေးလ်", en: "Email" },
  inactive: { my: "Inactive", en: "Inactive" },
  edit: { my: "ပြင်ရန်", en: "Edit" },
  save: { my: "သိမ်းရန်", en: "Save" },
  cancel: { my: "ပယ်ရန်", en: "Cancel" },
  saveDraft: { my: "Draft သိမ်းရန်", en: "Save Draft" },
  saveAndActivate: { my: "သိမ်းပြီး Active ထားရန်", en: "Save & Activate" },
  createTemplateAction: { my: "Template ဖန်တီးရန်", en: "Create Template" },
  updateTemplateAction: { my: "Template ပြင်ရန်", en: "Update Template" },
  noTemplatesAvailable: { my: "Template မရှိသေးပါ", en: "No templates available" },
  createFirstTemplate: { my: "Template တစ်ခုကို ဦးစွာဖန်တီးပါ", en: "Create a template first" },
  noCustomFieldsYet: { my: "စိတ်ကြိုက်ကွက် မရှိသေးပါ", en: "No custom fields yet" },
  fieldLabelText: { my: "ကွက်အမည်", en: "Field label" },
  placeholderTextHint: { my: "Placeholder စာသား", en: "Placeholder text" },
  requiredField: { my: "မဖြစ်မနေဖြည့်ရန်", en: "Required field" },
  selectOptionsHint: { my: "ရွေးချယ်စရာများ", en: "Select options" },
  keepFormAndTemplateAligned: { my: "Form နဲ့ template ကို တူညီအောင်ထားပါ", en: "Keep the form and template aligned" },
  chooseFormStructureFirst: { my: "ပထမဆုံး ဖောင်ဖွဲ့စည်းပုံကို ရွေးပါ", en: "Choose the form structure first" },
  deleteTemplate: { my: "Template ဖျက်ရန်", en: "Delete Template" },
  delete: { my: "ဖျက်ရန်", en: "Delete" },
  cannotBeUndone: { my: "ဤအရာကို ပြန်မရနိုင်ပါ", en: "This cannot be undone." },
  failedToDeleteTemplate: { my: "Template ဖျက်၍ မရပါ", en: "Failed to delete template." },
  failedToUpdateRole: { my: "Role ပြင်၍ မရပါ", en: "Failed to update role." },
  failedToUpdateTemplate: { my: "Template ပြင်၍ မရပါ", en: "Failed to update template." },
  users: { my: "အသုံးပြုသူများ", en: "Users" },
  fieldsCount: { my: "ကွက်များ", en: "Fields" },
  activeStatus: { my: "Active", en: "Active" },
  inactiveStatus: { my: "Inactive", en: "Inactive" },
  advancedSearch: { my: "အဆင့်မြင့် ရှာဖွေရန်", en: "Advanced Search" },
  resetAll: { my: "အားလုံး ပြန်ချရန်", en: "Reset all" },
  trackingTips: { my: "လိုက်လံစစ်ဆေးခြင်း အကြံပြုချက်", en: "Tracking tips" },
  serviceTypeLabel: { my: "ဝန်ဆောင်မှုအမျိုးအစား", en: "Service Type" },
  academicYearLabel: { my: "ပညာသင်နှစ်", en: "Academic Year" },
  statusLabel: { my: "အခြေအနေ", en: "Status" },
  schoolLabel: { my: "ကျောင်း", en: "School" },
  agentLabel: { my: "Agent", en: "Agent" },
  dateFrom: { my: "စတင်ရက်စွဲ", en: "Date From" },
  dateTo: { my: "ပြီးဆုံးရက်စွဲ", en: "Date To" },
  searchByNameSchoolService: { my: "ခုံနံပါတ်၊ နာမည်၊ ကျောင်း သို့မဟုတ် ဝန်ဆောင်မှုဖြင့် ရှာရန်", en: "Search by seat no, name, school, or service..." },
  resultsFound: { my: "ရလဒ်များ တွေ့ရှိ", en: "results found" },
  filtersActive: { my: "filter များ ဖွင့်ထားသည်", en: "filters active" },
  liveTracking: { my: "တိုက်ရိုက်လိုက်လံစစ်ဆေးမှု", en: "Live tracking" },
  firebaseNotConfigured: { my: "Firebase မသတ်မှတ်ရသေးပါ", en: "Firebase not configured" },
  noResultsFound: { my: "ရလဒ်မတွေ့ပါ", en: "No results found" },
  tryDifferentSearchTerms: { my: "ရှာဖွေရန် စကားလုံး သို့မဟုတ် filter များကို ပြောင်းကြည့်ပါ", en: "Try different search terms or filters" },
  setUpFirebaseToSearchDocuments: { my: "မှတ်တမ်းရှာရန် Firebase ကို ချိတ်ဆက်ပါ", en: "Set up Firebase to search documents" },
  noUsersFound: { my: "အသုံးပြုသူ မတွေ့ပါ", en: "No users found" },
  usersWillAppear: { my: "အသုံးပြုသူများ အကောင့်ဖွင့်ပြီးချင်း ပေါ်လာမည်", en: "Users will appear here once they sign up." },
  adminPanel: { my: "အက်ဒမင် စီမံခန့်ခွဲမှု", en: "Admin Panel" },
  createNewTemplate: { my: "Template အသစ် ဖန်တီးရန်", en: "Create New Template" },
  template: { my: "တမ်းပလိတ်", en: "Template" },
  basicInformation: { my: "အခြေခံအချက်အလက်", en: "Basic Information" },
  documentTitle: { my: "မှတ်တမ်းခေါင်းစဉ်", en: "Document Title" },
  schoolInstitution: { my: "ကျောင်း / အဖွဲ့အစည်း", en: "School / Institution" },
  agentProcessedBy: { my: "Agent / ဆောင်ရွက်သူ", en: "Agent / Processed By" },
  chooseTemplateStructure: { my: "ဖောင်ဖွဲ့စည်းပုံကို ဦးစွာရွေးပါ", en: "Choose the form structure first" },
  notesLabel: { my: "မှတ်ချက်", en: "Notes" },
  fieldLabelPrompt: { my: "ကွက်အမည်", en: "Field label" },
  fieldTypePrompt: { my: "ကွက်အမျိုးအစား", en: "Field type" },
  filters: { my: "Filter များ", en: "Filters" },
  sortBy: { my: "စီရန်", en: "Sort by" },
  templateOrderSort: { my: "စာတိုင်အလိုက်", en: "Template order" },
  newestFirst: { my: "အသစ်ဆုံး", en: "Newest" },
  oldestFirst: { my: "အဟောင်းဆုံး", en: "Oldest" },
  nameAZ: { my: "အမည် A-Z", en: "Name A-Z" },
  nameZA: { my: "အမည် Z-A", en: "Name Z-A" },
  yearNewest: { my: "နှစ်အသစ်ဆုံး", en: "Year Newest" },
  yearOldest: { my: "နှစ်အဟောင်းဆုံး", en: "Year Oldest" },
  seatAscending: { my: "ခုံနံပါတ်အလိုက်", en: "Seat Asc" },
  trackingTipsDescription: { my: "ဝန်ဆောင်မှု၊ နှစ်၊ အခြေအနေ၊ ကျောင်း၊ Agent နှင့် ရက်စွဲအလိုက် စစ်ထုတ်နိုင်သည်။", en: "Filter by service, year, status, school, agent, or date range to track document progress quickly." },
  filterBySchoolName: { my: "ကျောင်းအမည်ဖြင့် စစ်ရန်", en: "Filter by school name" },
  filterByAgentName: { my: "Agent အမည်ဖြင့် စစ်ရန်", en: "Filter by agent name" },
  searching: { my: "ရှာနေသည်...", en: "Searching..." },
  lastDriveError: { my: "Drive အမှား", en: "Last Drive Error" },
  languageDefaultNote: { my: "မြန်မာဘာသာကို မူရင်းအဖြစ်ထားထားပါသည်။", en: "Burmese is the default language." },
  permissionRequired: { my: "ဓာတ်ပုံရွေးရန် permission လိုအပ်ပါသည်", en: "Permission is required to choose a photo." },
} as const;

const SERVICE_TYPES = {
  "Degree Certificate": { my: "အောင်လက်မှတ်", en: "Degree Certificate" },
  Notary: { my: "Notary", en: "Notary" },
  Transcript: { my: "ထောက်ခံစာ / Transcript", en: "Transcript" },
  Translation: { my: "ဘာသာပြန်", en: "Translation" },
  Other: { my: "အခြား", en: "Other" },
} as const;

const STATUS_LABELS: Record<DocumentStatus, { my: string; en: string }> = {
  active: { my: "Active", en: "Active" },
  draft: { my: "Draft", en: "Draft" },
  archived: { my: "Archived", en: "Archived" },
};

const FIELD_TYPES: Record<FieldType, { my: string; en: string }> = {
  text: { my: "စာတို", en: "Text" },
  textarea: { my: "စာပိုဒ်", en: "Long Text" },
  date: { my: "ရက်စွဲ", en: "Date" },
  number: { my: "ကိန်းဂဏန်း", en: "Number" },
  select: { my: "ရွေးချယ်ရန်", en: "Dropdown" },
  email: { my: "အီးမေးလ်", en: "Email" },
  phone: { my: "ဖုန်းနံပါတ်", en: "Phone" },
};

export function translate(language: LanguageCode, key: keyof typeof TEXT): string {
  return TEXT[key]?.[language] ?? TEXT[key]?.[DEFAULT_LANGUAGE] ?? String(key);
}

export function translateServiceType(language: LanguageCode, serviceType: string): string {
  return SERVICE_TYPES[serviceType as keyof typeof SERVICE_TYPES]?.[language] ?? serviceType;
}

export function translateStatus(language: LanguageCode, status: DocumentStatus): string {
  return STATUS_LABELS[status]?.[language] ?? status;
}

export function translateFieldType(language: LanguageCode, fieldType: FieldType): string {
  return FIELD_TYPES[fieldType]?.[language] ?? fieldType;
}

export function localizedText(
  language: LanguageCode,
  value?: string,
  valueMy?: string,
  valueEn?: string,
): string {
  if (language === "en") return valueEn || valueMy || value || "";
  return valueMy || value || valueEn || "";
}

export function formatLocalizedDate(date: string | Date | undefined, language: LanguageCode, options: Intl.DateTimeFormatOptions = {
  day: "numeric",
  month: "long",
  year: "numeric",
}): string {
  if (!date) return "";
  const resolved = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(resolved.getTime())) return "";
  const locale = language === "en" ? "en-US" : "my-MM";
  return new Intl.DateTimeFormat(locale, options).format(resolved);
}

export function localizePlaceholder(
  language: LanguageCode,
  field: { placeholder?: string; placeholderMy?: string; placeholderEn?: string },
  fallback: string,
): string {
  return language === "en"
    ? field.placeholderEn || field.placeholderMy || field.placeholder || fallback
    : field.placeholderMy || field.placeholder || field.placeholderEn || fallback;
}

export function localizeFieldLabel(
  language: LanguageCode,
  field: { label: string; labelMy?: string; labelEn?: string },
): string {
  return language === "en"
    ? field.label || field.labelEn || field.labelMy || ""
    : field.label || field.labelMy || field.labelEn || "";
}

export function localizeFieldDescription(
  language: LanguageCode,
  field: { description?: string; descriptionMy?: string; descriptionEn?: string },
): string {
  return language === "en"
    ? field.descriptionEn || field.descriptionMy || field.description || ""
    : field.descriptionMy || field.description || field.descriptionEn || "";
}

export function getGreetingKey(hour: number): keyof typeof TEXT {
  if (hour < 12) return "dashboardGreetingMorning";
  if (hour < 17) return "dashboardGreetingAfternoon";
  return "dashboardGreetingEvening";
}
