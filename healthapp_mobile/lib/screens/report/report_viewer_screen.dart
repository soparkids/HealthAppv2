import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../models/report.dart';
import '../../providers/report_provider.dart';

class ReportViewerScreen extends ConsumerWidget {
  final String recordId;
  final String reportId;
  const ReportViewerScreen({super.key, required this.recordId, required this.reportId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final reportData = ref.watch(reportTermsProvider(reportId));
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(title: const Text('Full Report')),
      body: reportData.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error_outline, size: 48, color: Colors.grey),
              const SizedBox(height: 16),
              const Text('Failed to load report'),
              const SizedBox(height: 8),
              FilledButton(onPressed: () => ref.invalidate(reportTermsProvider(reportId)), child: const Text('Retry')),
            ],
          ),
        ),
        data: (data) => ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Card(
              color: Colors.blue.shade50,
              child: const Padding(
                padding: EdgeInsets.all(12),
                child: Row(
                  children: [
                    Icon(Icons.info_outline, size: 18, color: Colors.blue),
                    SizedBox(width: 8),
                    Expanded(child: Text('Tap highlighted terms to see plain-language explanations.', style: TextStyle(fontSize: 13, color: Colors.blue))),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            _HighlightedReport(content: data.report.content, terms: data.terms),
            if (data.report.summary != null) ...[
              const SizedBox(height: 24),
              Text('Summary', style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              Card(color: Colors.green.shade50, child: Padding(padding: const EdgeInsets.all(16), child: Text(data.report.summary!))),
            ],
          ],
        ),
      ),
    );
  }
}

class _HighlightedReport extends StatelessWidget {
  final String content;
  final List<HighlightedTerm> terms;
  const _HighlightedReport({required this.content, required this.terms});

  @override
  Widget build(BuildContext context) {
    if (terms.isEmpty) return Text(content, style: const TextStyle(height: 1.6));

    final sorted = [...terms]..sort((a, b) => a.startIndex.compareTo(b.startIndex));
    final spans = <InlineSpan>[];
    var lastEnd = 0;

    for (final term in sorted) {
      if (term.startIndex < lastEnd) continue;
      if (term.startIndex > lastEnd) spans.add(TextSpan(text: content.substring(lastEnd, term.startIndex)));
      spans.add(WidgetSpan(child: _TermChip(text: content.substring(term.startIndex, term.endIndex), term: term)));
      lastEnd = term.endIndex;
    }
    if (lastEnd < content.length) spans.add(TextSpan(text: content.substring(lastEnd)));

    return Text.rich(TextSpan(children: spans), style: const TextStyle(height: 1.6));
  }
}

class _TermChip extends StatelessWidget {
  final String text;
  final HighlightedTerm term;
  const _TermChip({required this.text, required this.term});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => _showDefinition(context),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
        decoration: BoxDecoration(
          color: Colors.amber.shade100,
          borderRadius: BorderRadius.circular(4),
          border: Border.all(color: Colors.amber.shade300),
        ),
        child: Text(text, style: TextStyle(color: Colors.amber.shade900, fontWeight: FontWeight.w500)),
      ),
    );
  }

  void _showDefinition(BuildContext context) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(16))),
      builder: (context) => Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(color: Colors.grey.shade200, borderRadius: BorderRadius.circular(4)),
              child: Text(term.category, style: TextStyle(fontSize: 12, color: Colors.grey.shade700)),
            ),
            const SizedBox(height: 12),
            Text(term.term, style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            Text(term.definition, style: const TextStyle(height: 1.5)),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }
}
