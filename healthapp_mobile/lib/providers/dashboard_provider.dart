import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/follow_up.dart';
import '../models/medical_record.dart';
import 'records_provider.dart';

class DashboardData {
  final int totalRecords;
  final int pendingFollowUps;
  final List<MedicalRecord> recentRecords;
  final List<FollowUp> upcomingFollowUps;

  const DashboardData({required this.totalRecords, required this.pendingFollowUps, required this.recentRecords, required this.upcomingFollowUps});
}

final dashboardProvider = FutureProvider<DashboardData>((ref) async {
  final service = ref.read(recordsServiceProvider);
  final recordsResponse = await service.getRecords(limit: 5);
  final followUps = await service.getFollowUps();

  final pending = followUps.where((f) => f.status == FollowUpStatus.pending || f.status == FollowUpStatus.scheduled).toList();

  return DashboardData(
    totalRecords: recordsResponse.total,
    pendingFollowUps: pending.length,
    recentRecords: recordsResponse.records,
    upcomingFollowUps: pending,
  );
});
