import urllib.request
import json

def post(url, data, token=None):
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = f'Bearer {token}'
    req = urllib.request.Request(url, data=json.dumps(data).encode(), headers=headers)
    try:
        with urllib.request.urlopen(req) as res:
            return res.status, json.loads(res.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode())

def get(url, token=None):
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = f'Bearer {token}'
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req) as res:
            return res.status, json.loads(res.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode())

# 1. Lookup Test
print('--- 1. Testing /api/auth/lookup ---')
s, r = post('http://localhost:4173/api/auth/lookup', {'userId': 'alex'})
print('Lookup alex:', s, r)
s, r = post('http://localhost:4173/api/auth/lookup', {'userId': 'admin'})
print('Lookup admin:', s, r)

# 2. Login User on Device 1 (Desktop Windows)
print('--- 2. Login alex on Primary Device (Desktop Windows) ---')
s, r1 = post('http://localhost:4173/api/auth/login', {
    'userId': 'alex',
    'password': 'AlexPass2026!',
    'deviceInfo': {'deviceId': 'dev_pc_1', 'deviceType': 'Desktop', 'os': 'Windows 11', 'browser': 'Google Chrome'}
})
print('Alex Login 1:', s, 'Success:', r1.get('success'), 'Different device?:', r1.get('differentDeviceDetected'))

# 3. Login User on Device 2 (Mobile Android) -> SHOULD TRIGGER ANOMALY / DIFFERENT DEVICE DETECTED
print('--- 3. Login alex on DIFFERENT Device (Mobile Android) ---')
s, r2 = post('http://localhost:4173/api/auth/login', {
    'userId': 'alex',
    'password': 'AlexPass2026!',
    'deviceInfo': {'deviceId': 'dev_phone_2', 'deviceType': 'Mobile', 'os': 'Android 14', 'browser': 'Mobile Chrome'}
})
print('Alex Login 2 (Different Device):', s, 'Different device?:', r2.get('differentDeviceDetected'))
print('Details:', r2.get('anomalyDetails'))

# 4. Login Admin and Fetch Audit Logs
print('--- 4. Login admin & Fetch Audit Logs ---')
s, r_admin = post('http://localhost:4173/api/auth/login', {
    'userId': 'admin',
    'password': 'AdminSecure2026!',
    'deviceInfo': {'deviceId': 'dev_admin_mac', 'deviceType': 'Laptop', 'os': 'macOS', 'browser': 'Safari'}
})
admin_token = r_admin.get('token')
print('Admin Login:', s, 'Admin token created:', bool(admin_token))

s, audit = get('http://localhost:4173/api/admin/audit-logs', token=admin_token)
print('Audit Logs fetched:', s)
print('Summary:', audit.get('summary'))
print('Active Sessions Count:', len(audit.get('activeSessions', [])))
for sess in audit.get('activeSessions', []):
    u_name = sess.get('name')
    u_id = sess.get('userId')
    dev = sess.get('deviceType')
    os_name = sess.get('os')
    anomaly = sess.get('differentDeviceDetected')
    print(f'-> Session: {u_name} (@{u_id}) on {dev} ({os_name}) | Anomaly Flag: {anomaly}')

