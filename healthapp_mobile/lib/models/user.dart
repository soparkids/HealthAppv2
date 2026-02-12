class User {
  final String id;
  final String email;
  final String? name;
  final String role;
  final String? avatar;
  final DateTime createdAt;

  const User({
    required this.id,
    required this.email,
    this.name,
    required this.role,
    this.avatar,
    required this.createdAt,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'] as String,
      email: json['email'] as String,
      name: json['name'] as String?,
      role: json['role'] as String,
      avatar: json['avatar'] as String?,
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }
}
