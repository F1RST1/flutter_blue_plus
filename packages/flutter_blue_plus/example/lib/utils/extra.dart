import 'utils.dart';

import 'package:flutter_blue_plus/flutter_blue_plus.dart';

final Map<DeviceIdentifier, StreamControllerReemit<bool>> _cglobal = {};
final Map<DeviceIdentifier, StreamControllerReemit<bool>> _dglobal = {};

/// connect & disconnect + update stream
extension Extra on BluetoothDevice {
  // convenience
  StreamControllerReemit<bool> get _cstream {
    _cglobal[remoteId] ??= StreamControllerReemit(initialValue: false);
    return _cglobal[remoteId]!;
  }

  // convenience
  StreamControllerReemit<bool> get _dstream {
    _dglobal[remoteId] ??= StreamControllerReemit(initialValue: false);
    return _dglobal[remoteId]!;
  }

  // get stream
  Stream<bool> get isConnecting {
    return _cstream.stream;
  }

  // get stream
  Stream<bool> get isDisconnecting {
    return _dstream.stream;
  }

  // connect & update stream
  Future<void> connectAndUpdateStream() async {
    print('[DIAG][Connect] connectAndUpdateStream started; alreadyConnected=$isConnected');
    _cstream.add(true);
    try {
      await connect(license: License.nonprofit, mtu: null);
      print('[DIAG][Connect] BluetoothDevice.connect succeeded; connected=$isConnected');
    } catch (e, stackTrace) {
      print('[DIAG][Connect] BluetoothDevice.connect failed: $e\n$stackTrace');
      rethrow;
    } finally {
      _cstream.add(false);
      print('[DIAG][Connect] connectAndUpdateStream finished; connected=$isConnected');
    }
  }

  // disconnect & update stream
  Future<void> disconnectAndUpdateStream({bool queue = true}) async {
    _dstream.add(true);
    try {
      await disconnect(queue: queue);
    } finally {
      _dstream.add(false);
    }
  }
}
