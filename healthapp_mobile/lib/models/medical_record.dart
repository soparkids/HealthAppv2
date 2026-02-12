import 'report.dart';

enum RecordType {
  mri,
  xray,
  ultrasound,
  ctScan,
  other;

  static RecordType fromString(String value) {
    switch (value) {
      case 'MRI':
        return RecordType.mri;
      case 'XRAY':
        return RecordType.xray;
      case 'ULTRASOUND':
        return RecordType.ultrasound;
      case 'CT_SCAN':
        return RecordType.ctScan;
      default:
        return RecordType.other;
    }
  }

  String get displayName {
    switch (this) {
      case RecordType.mri:
        return 'MRI';
      case RecordType.xray:
        return 'X-Ray';
      case RecordType.ultrasound:
        return 'Ultrasound';
      case RecordType.ctScan:
        return 'CT Scan';
      case RecordType.other:
        return 'Other';
    }
  }
}

class MedicalRecord {
  final String id;
  final String userId;
  final String title;
  final RecordType type;
  final String? bodyPart;
  final String? facility;
  final String? referringPhysician;
  final DateTime recordDate;
  final String? fileUrl;
  final String? thumbnailUrl;
  final String? fileType;
  final int? fileSize;
  final String? notes;
  final DateTime createdAt;
  final DateTime updatedAt;
  final Report? report;

  const MedicalRecord({
    required this.id,
    required this.userId,
    required this.title,
    required this.type,
    this.bodyPart,
    this.facility,
    this.referringPhysician,
    required this.recordDate,
    this.fileUrl,
    this.thumbnailUrl,
    this.fileType,
    this.fileSize,
    this.notes,
    required this.createdAt,
    required this.updatedAt,
    this.report,
  });

  factory MedicalRecord.fromJson(Map<String, dynamic> json) {
    return MedicalRecord(
      id: json['id'] as String,
      userId: json['userId'] as String,
      title: json['title'] as String,
      type: RecordType.fromString(json['type'] as String),
      bodyPart: json['bodyPart'] as String?,
      facility: json['facility'] as String?,
      referringPhysician: json['referringPhysician'] as String?,
      recordDate: DateTime.parse(json['recordDate'] as String),
      fileUrl: json['fileUrl'] as String?,
      thumbnailUrl: json['thumbnailUrl'] as String?,
      fileType: json['fileType'] as String?,
      fileSize: json['fileSize'] as int?,
      notes: json['notes'] as String?,
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
      report: json['report'] != null
          ? Report.fromJson(json['report'] as Map<String, dynamic>)
          : null,
    );
  }
}
