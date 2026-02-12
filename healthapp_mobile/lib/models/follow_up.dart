enum FollowUpStatus {
  pending,
  scheduled,
  completed,
  overdue;

  static FollowUpStatus fromString(String value) {
    switch (value) {
      case 'PENDING':
        return FollowUpStatus.pending;
      case 'SCHEDULED':
        return FollowUpStatus.scheduled;
      case 'COMPLETED':
        return FollowUpStatus.completed;
      case 'OVERDUE':
        return FollowUpStatus.overdue;
      default:
        return FollowUpStatus.pending;
    }
  }

  String get displayName {
    switch (this) {
      case FollowUpStatus.pending:
        return 'Pending';
      case FollowUpStatus.scheduled:
        return 'Scheduled';
      case FollowUpStatus.completed:
        return 'Completed';
      case FollowUpStatus.overdue:
        return 'Overdue';
    }
  }
}

class FollowUpRecord {
  final String id;
  final String title;
  final String type;

  const FollowUpRecord({
    required this.id,
    required this.title,
    required this.type,
  });

  factory FollowUpRecord.fromJson(Map<String, dynamic> json) {
    return FollowUpRecord(
      id: json['id'] as String,
      title: json['title'] as String,
      type: json['type'] as String,
    );
  }
}

class FollowUp {
  final String id;
  final String userId;
  final String? medicalRecordId;
  final String recommendation;
  final FollowUpStatus status;
  final DateTime? dueDate;
  final String? notes;
  final DateTime createdAt;
  final DateTime updatedAt;
  final FollowUpRecord? medicalRecord;

  const FollowUp({
    required this.id,
    required this.userId,
    this.medicalRecordId,
    required this.recommendation,
    required this.status,
    this.dueDate,
    this.notes,
    required this.createdAt,
    required this.updatedAt,
    this.medicalRecord,
  });

  factory FollowUp.fromJson(Map<String, dynamic> json) {
    return FollowUp(
      id: json['id'] as String,
      userId: json['userId'] as String,
      medicalRecordId: json['medicalRecordId'] as String?,
      recommendation: json['recommendation'] as String,
      status: FollowUpStatus.fromString(json['status'] as String),
      dueDate: json['dueDate'] != null
          ? DateTime.parse(json['dueDate'] as String)
          : null,
      notes: json['notes'] as String?,
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
      medicalRecord: json['medicalRecord'] != null
          ? FollowUpRecord.fromJson(
              json['medicalRecord'] as Map<String, dynamic>)
          : null,
    );
  }
}
