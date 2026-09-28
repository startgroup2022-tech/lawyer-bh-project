import 'dart:convert';
import 'dart:io';

const _buildMarker = '<!-- saraya-square-phase1 -->';

Future<void> main() async {
  final appDirectory = File.fromUri(Platform.script).parent.parent;
  final buildDirectory = Directory('${appDirectory.path}/build/web');
  final sourceIndex = File('${buildDirectory.path}/index.html');

  if (!await sourceIndex.exists()) {
    stderr.writeln('Missing build/web/index.html. Build the web app first.');
    exitCode = 1;
    return;
  }

  final sourceHtml = await sourceIndex.readAsString();
  if (!sourceHtml.contains('<base href="/saraya/">')) {
    stderr.writeln('The web build must use --base-href /saraya/.');
    exitCode = 1;
    return;
  }

  final publicDirectory = Directory(
    '${appDirectory.parent.path}/lawyers.bh/public/saraya',
  );
  final parentDirectory = publicDirectory.parent;
  final uniqueSuffix = DateTime.now().microsecondsSinceEpoch;
  final stagingDirectory = Directory(
    '${parentDirectory.path}/.saraya-staging-$uniqueSuffix',
  );
  final backupDirectory = Directory(
    '${parentDirectory.path}/.saraya-backup-$uniqueSuffix',
  );

  var backupCreated = false;
  try {
    await _copyDirectory(buildDirectory, stagingDirectory);
    await _prepareAndValidate(stagingDirectory);

    if (await publicDirectory.exists()) {
      await publicDirectory.rename(backupDirectory.path);
      backupCreated = true;
    }

    await stagingDirectory.rename(publicDirectory.path);

    if (backupCreated && await backupDirectory.exists()) {
      await backupDirectory.delete(recursive: true);
    }

    stdout.writeln(
      'Published the Saraya web bundle to ${publicDirectory.path}.',
    );
  } catch (error) {
    if (await stagingDirectory.exists()) {
      await stagingDirectory.delete(recursive: true);
    }
    if (backupCreated) {
      if (await publicDirectory.exists()) {
        await publicDirectory.delete(recursive: true);
      }
      if (await backupDirectory.exists()) {
        await backupDirectory.rename(publicDirectory.path);
      }
    }
    stderr.writeln(
      'Publishing failed; the previous bundle was preserved: $error',
    );
    exitCode = 1;
  }
}

Future<void> _prepareAndValidate(Directory directory) async {
  final indexFile = File('${directory.path}/index.html');
  var html = await indexFile.readAsString();
  if (!html.contains('<base href="/saraya/">')) {
    throw const FormatException('Invalid base href in staged index.html.');
  }
  if (!html.contains(_buildMarker)) {
    html = html.replaceFirst('<body>', '<body>\n  $_buildMarker');
    await indexFile.writeAsString(html);
  }

  final versionFile = File('${directory.path}/version.json');
  if (!await versionFile.exists()) {
    throw const FormatException('Missing version.json in staged build.');
  }
  final version = jsonDecode(await versionFile.readAsString());
  if (version is! Map<String, dynamic>) {
    throw const FormatException('Invalid version.json object.');
  }
  version['app_name'] = 'saraya_square_app';
  await versionFile.writeAsString('${jsonEncode(version)}\n');

  if (!(await indexFile.readAsString()).contains(_buildMarker)) {
    throw const FormatException('Missing Phase 1 build marker.');
  }
}

Future<void> _copyDirectory(Directory source, Directory destination) async {
  await destination.create(recursive: true);
  await for (final entity in source.list(
    recursive: false,
    followLinks: false,
  )) {
    final name = entity.uri.pathSegments
        .where((segment) => segment.isNotEmpty)
        .last;
    final targetPath = '${destination.path}/$name';
    if (entity is Directory) {
      await _copyDirectory(entity, Directory(targetPath));
    } else if (entity is File) {
      await entity.copy(targetPath);
    } else if (entity is Link) {
      await Link(targetPath).create(await entity.target());
    }
  }
}
