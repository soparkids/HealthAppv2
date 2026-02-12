class Report {
  final String id;
  final String medicalRecordId;
  final String content;
  final String? summary;
  final String? keyFindings;
  final DateTime createdAt;

  const Report({
    required this.id,
    required this.medicalRecordId,
    required this.content,
    this.summary,
    this.keyFindings,
    required this.createdAt,
  });

  factory Report.fromJson(Map<String, dynamic> json) {
    return Report(
      id: json['id'] as String,
      medicalRecordId: json['medicalRecordId'] as String,
      content: json['content'] as String,
      summary: json['summary'] as String?,
      keyFindings: json['keyFindings'] as String?,
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }
}

class HighlightedTerm {
  final String term;
  final String definition;
  final String category;
  final int startIndex;
  final int endIndex;

  const HighlightedTerm({
    required this.term,
    required this.definition,
    required this.category,
    required this.startIndex,
    required this.endIndex,
  });

  factory HighlightedTerm.fromJson(Map<String, dynamic> json) {
    return HighlightedTerm(
      term: json['term'] as String,
      definition: json['definition'] as String,
      category: json['category'] as String,
      startIndex: json['startIndex'] as int,
      endIndex: json['endIndex'] as int,
    );
  }
}
