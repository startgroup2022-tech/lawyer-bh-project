import 'client_platform_stub.dart'
    if (dart.library.io) 'client_platform_io.dart';

bool get isNativeClient => platformIsNativeClient;
