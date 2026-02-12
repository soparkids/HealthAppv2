import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../config/theme.dart';
import '../../models/follow_up.dart';
import '../../models/medical_record.dart';
import '../../providers/auth_provider.dart';
import '../../providers/dashboard_provider.dart';

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authProvider);
    final dashboard = ref.watch(dashboardProvider);
    final theme = Theme.of(context);
    final name = auth.user?.name?.split(' ').first ?? 'there';

    return Scaffold(
      appBar: AppBar(
        title: Text('Welcome, $name', style: const TextStyle(fontWeight: FontWeight.bold)),
      ),
      body: dashboard.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error_outline, size: 48, color: Colors.grey),
              const SizedBox(height: 16),
              Text('Failed to load dashboard', style: theme.textTheme.bodyLarge),
              const SizedBox(height: 8),
              FilledButton(onPressed: () => ref.invalidate(dashboardProvider), child: const Text('Retry')),
            ],
          ),
        ),
        data: (data) => RefreshIndicator(
          onRefresh: () async => ref.invalidate(dashboardProvider),
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Row(
                children: [
                  _StatCard(icon: Icons.folder, label: 'Records', value: '${data.totalRecords}', color: AppTheme.primaryBlue),
                  const SizedBox(width: 12),
                  _StatCard(icon: Icons.schedule, label: 'Follow-ups', value: '${data.pendingFollowUps}', color: AppTheme.warningAmber),
                ],
              ),
              const SizedBox(height: 24),
              _SectionHeader(title: 'Recent Records', onViewAll: () => context.go('/records')),
              const SizedBox(height: 8),
              ...data.recentRecords.map((r) => _RecordTile(record: r)),
              if (data.upcomingFollowUps.isNotEmpty) ...[
                const SizedBox(height: 24),
                const _SectionHeader(title: 'Upcoming Follow-ups'),
                const SizedBox(height: 8),
                ...data.upcomingFollowUps.map((f) => _FollowUpTile(followUp: f)),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final Color color;
  const _StatCard({required this.icon, required this.label, required this.value, required this.color});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(color: color.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(10)),
                child: Icon(icon, color: color, size: 24),
              ),
              const SizedBox(width: 12),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(value, style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold)),
                  Text(label, style: TextStyle(color: Colors.grey.shade600, fontSize: 13)),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  final String title;
  final VoidCallback? onViewAll;
  const _SectionHeader({required this.title, this.onViewAll});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(title, style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
        if (onViewAll != null) TextButton(onPressed: onViewAll, child: const Text('View all')),
      ],
    );
  }
}

class _RecordTile extends StatelessWidget {
  final MedicalRecord record;
  const _RecordTile({required this.record});

  @override
  Widget build(BuildContext context) {
    final color = AppTheme.recordTypeColor(record.type.name.toUpperCase());
    return Card(
      child: ListTile(
        leading: Container(
          width: 40, height: 40,
          decoration: BoxDecoration(color: color.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(8)),
          child: Icon(Icons.description, color: color, size: 20),
        ),
        title: Text(record.title),
        subtitle: Text('${record.type.displayName}  •  ${DateFormat.yMMMd().format(record.recordDate)}', style: TextStyle(color: Colors.grey.shade600, fontSize: 13)),
        trailing: const Icon(Icons.chevron_right),
        onTap: () => context.push('/records/${record.id}'),
      ),
    );
  }
}

class _FollowUpTile extends StatelessWidget {
  final FollowUp followUp;
  const _FollowUpTile({required this.followUp});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: ListTile(
        leading: Container(
          width: 40, height: 40,
          decoration: BoxDecoration(color: AppTheme.warningAmber.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(8)),
          child: Icon(Icons.schedule, color: AppTheme.warningAmber, size: 20),
        ),
        title: Text(followUp.recommendation),
        subtitle: Text(
          followUp.dueDate != null ? 'Due: ${DateFormat.yMMMd().format(followUp.dueDate!)}' : followUp.status.displayName,
          style: TextStyle(color: Colors.grey.shade600, fontSize: 13),
        ),
      ),
    );
  }
}
