export interface MedicalRecord {
  id: string;
  title: string;
  type: "X-Ray" | "MRI" | "CT Scan" | "Ultrasound" | "Lab Report" | "Pathology";
  bodyPart: string;
  date: string;
  facility: string;
  physician: string;
  notes: string;
  thumbnailUrl: string;
  status: "available" | "pending" | "processing";
}

export interface FollowUp {
  id: string;
  title: string;
  date: string;
  physician: string;
  type: string;
}

export interface ActivityItem {
  id: string;
  action: string;
  target: string;
  date: string;
}

export const currentUser = {
  id: "user-1",
  name: "Sarah Johnson",
  email: "sarah.johnson@email.com",
  avatarUrl: null as string | null,
};

export const mockRecords: MedicalRecord[] = [
  {
    id: "rec-1",
    title: "Chest X-Ray",
    type: "X-Ray",
    bodyPart: "Chest",
    date: "2026-02-03",
    facility: "City General Hospital",
    physician: "Dr. Michael Chen",
    notes: "Annual routine checkup. No abnormalities detected.",
    thumbnailUrl: "/placeholder-xray.svg",
    status: "available",
  },
  {
    id: "rec-2",
    title: "Brain MRI",
    type: "MRI",
    bodyPart: "Head",
    date: "2026-01-22",
    facility: "NeuroHealth Imaging Center",
    physician: "Dr. Emily Rodriguez",
    notes: "Follow-up from headache consultation. Normal findings.",
    thumbnailUrl: "/placeholder-mri.svg",
    status: "available",
  },
  {
    id: "rec-3",
    title: "Abdominal CT Scan",
    type: "CT Scan",
    bodyPart: "Abdomen",
    date: "2026-01-15",
    facility: "Metro Diagnostic Clinic",
    physician: "Dr. James Park",
    notes: "Ordered for abdominal pain evaluation.",
    thumbnailUrl: "/placeholder-ct.svg",
    status: "available",
  },
  {
    id: "rec-4",
    title: "Knee Ultrasound",
    type: "Ultrasound",
    bodyPart: "Right Knee",
    date: "2026-01-08",
    facility: "SportsMed Clinic",
    physician: "Dr. Lisa Thompson",
    notes: "Post-injury assessment. Minor inflammation noted.",
    thumbnailUrl: "/placeholder-us.svg",
    status: "available",
  },
  {
    id: "rec-5",
    title: "Complete Blood Count",
    type: "Lab Report",
    bodyPart: "N/A",
    date: "2025-12-20",
    facility: "City General Hospital",
    physician: "Dr. Michael Chen",
    notes: "Annual blood work. All values within normal range.",
    thumbnailUrl: "/placeholder-lab.svg",
    status: "available",
  },
  {
    id: "rec-6",
    title: "Lumbar Spine MRI",
    type: "MRI",
    bodyPart: "Lower Back",
    date: "2025-12-10",
    facility: "NeuroHealth Imaging Center",
    physician: "Dr. Robert Kim",
    notes: "Lower back pain evaluation. Mild disc bulge at L4-L5.",
    thumbnailUrl: "/placeholder-mri.svg",
    status: "available",
  },
  {
    id: "rec-7",
    title: "Thyroid Pathology",
    type: "Pathology",
    bodyPart: "Neck",
    date: "2025-11-28",
    facility: "Metro Diagnostic Clinic",
    physician: "Dr. Sarah Williams",
    notes: "Fine needle aspiration biopsy. Benign result.",
    thumbnailUrl: "/placeholder-path.svg",
    status: "available",
  },
  {
    id: "rec-8",
    title: "Shoulder X-Ray",
    type: "X-Ray",
    bodyPart: "Left Shoulder",
    date: "2025-11-15",
    facility: "SportsMed Clinic",
    physician: "Dr. Lisa Thompson",
    notes: "Rotator cuff assessment. No fracture detected.",
    thumbnailUrl: "/placeholder-xray.svg",
    status: "available",
  },
];

export const mockFollowUps: FollowUp[] = [
  {
    id: "fu-1",
    title: "MRI Follow-up Consultation",
    date: "2026-02-18",
    physician: "Dr. Emily Rodriguez",
    type: "Consultation",
  },
  {
    id: "fu-2",
    title: "Annual Physical Exam",
    date: "2026-03-05",
    physician: "Dr. Michael Chen",
    type: "Check-up",
  },
  {
    id: "fu-3",
    title: "Knee Re-evaluation",
    date: "2026-03-12",
    physician: "Dr. Lisa Thompson",
    type: "Follow-up",
  },
];

export const mockActivity: ActivityItem[] = [
  {
    id: "act-1",
    action: "Uploaded",
    target: "Chest X-Ray",
    date: "2026-02-03",
  },
  {
    id: "act-2",
    action: "Shared",
    target: "Brain MRI with Dr. Rodriguez",
    date: "2026-01-25",
  },
  {
    id: "act-3",
    action: "Downloaded",
    target: "Abdominal CT Scan report",
    date: "2026-01-16",
  },
  {
    id: "act-4",
    action: "Received",
    target: "Knee Ultrasound results",
    date: "2026-01-10",
  },
  {
    id: "act-5",
    action: "Shared",
    target: "Lab Report with Family",
    date: "2025-12-22",
  },
];

export const dashboardStats = {
  totalRecords: 8,
  pendingFollowUps: 3,
  sharedRecords: 4,
  familyMembers: 2,
};

export const recordTypeColors: Record<string, string> = {
  "X-Ray": "primary",
  MRI: "accent",
  "CT Scan": "warning",
  Ultrasound: "success",
  "Lab Report": "default",
  Pathology: "danger",
};
