import urllib.request
import json
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = 'http://localhost:4173'

def post_json(endpoint, data, token=None):
    url = f"{BASE_URL}{endpoint}"
    req = urllib.request.Request(
        url,
        data=json.dumps(data).encode('utf-8'),
        headers={
            'Content-Type': 'application/json',
            **({'Authorization': f'Bearer {token}'} if token else {})
        }
    )
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, json.loads(resp.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8')
        try:
            return e.code, json.loads(body)
        except:
            return e.code, {'raw': body}

def get_json(endpoint, token=None):
    url = f"{BASE_URL}{endpoint}"
    req = urllib.request.Request(
        url,
        headers={
            'Content-Type': 'application/json',
            **({'Authorization': f'Bearer {token}'} if token else {})
        }
    )
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, json.loads(resp.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8')
        try:
            return e.code, json.loads(body)
        except:
            return e.code, {'raw': body}

def run_test():
    print("=" * 70)
    print("🚀 RUNNING 30-STEP MEDIAFORGE ACCEPTANCE TEST SUITE")
    print("=" * 70)

    # 0. Admin Login to obtain Admin Token
    print("\n[Step 0] Admin login with ADMIN001...")
    status, res = post_json('/api/auth/login', {
        'userId': 'ADMIN001',
        'password': 'AdminPass2026!',
        'deviceId': 'admin-console-001',
        'deviceInfo': {'friendlyName': 'Admin Workstation', 'deviceType': 'Desktop', 'os': 'Windows', 'browser': 'Chrome'}
    })
    assert status == 200, f"Admin login failed: {res}"
    assert res.get('success') is True
    admin_token = res.get('token')
    print("✓ Admin successfully authenticated. Token received.")

    # -------------------------------------------------------------
    # Sequence 1: USER001 on Laptop A (Steps 1 to 10)
    # -------------------------------------------------------------
    laptop_a_id = "device_laptop_a_1111"
    laptop_a_info = {
        'friendlyName': 'Windows Laptop',
        'deviceType': 'Laptop',
        'os': 'Windows',
        'browser': 'Chrome'
    }

    print("\n[Step 1-3] USER001 logs in from Laptop A (Device unknown)...")
    status, res = post_json('/api/auth/login', {
        'userId': 'USER001',
        'password': 'User001Pass!',
        'deviceId': laptop_a_id,
        'deviceInfo': laptop_a_info
    })
    print(f"Status: {status}, Code: {res.get('code')}")
    assert status == 403
    assert res.get('code') == 'NEW_DEVICE_DETECTED'
    assert res.get('requiresApproval') is True
    print("✓ Step 1-3 Passed: Credentials correct, New Device detected, Name request screen required.")

    print("\n[Step 4] User submits name 'Santhosh Reddy' for Laptop A...")
    status, res = post_json('/api/auth/request-device-approval', {
        'userId': 'USER001',
        'name': 'Santhosh Reddy',
        'deviceId': laptop_a_id,
        'deviceInfo': laptop_a_info
    })
    assert status == 200
    assert res.get('status') == 'pending'
    print("✓ Step 4 Passed: Name submitted, request created.")

    print("\n[Step 5] Admin checks Device Requests in Admin Portal...")
    status, res = get_json('/api/admin/device-requests', admin_token)
    assert status == 200
    requests = res.get('requests', [])
    laptop_a_req = next((r for r in requests if r['userId'] == 'USER001' and r['deviceId'] == laptop_a_id), None)
    assert laptop_a_req is not None, "Laptop A request not found in pending requests!"
    assert laptop_a_req['name'] == 'Santhosh Reddy'
    assert laptop_a_req['friendlyName'] == 'Windows Laptop'
    print(f"✓ Step 5 Passed: Request found in Admin Portal (Request ID: {laptop_a_req['requestId']}).")

    print("\n[Step 6] Verify USER001 cannot access MediaForge while pending...")
    status, res = post_json('/api/auth/login', {
        'userId': 'USER001',
        'password': 'User001Pass!',
        'deviceId': laptop_a_id,
        'deviceInfo': laptop_a_info
    })
    assert status == 403
    assert res.get('code') == 'APPROVAL_PENDING'
    print("✓ Step 6 Passed: User strictly blocked with 'Waiting for administrator approval'.")

    print("\n[Step 7] Admin approves Laptop A...")
    status, res = post_json('/api/admin/device-requests/approve', {
        'requestId': laptop_a_req['requestId'],
        'deviceId': laptop_a_id,
        'userId': 'USER001'
    }, admin_token)
    assert status == 200 and res.get('success') is True
    print("✓ Step 7 Passed: Admin approved Laptop A.")

    print("\n[Step 8-10] USER001 logs in again from Laptop A...")
    status, res = post_json('/api/auth/login', {
        'userId': 'USER001',
        'password': 'User001Pass!',
        'deviceId': laptop_a_id,
        'deviceInfo': laptop_a_info
    })
    assert status == 200
    assert res.get('success') is True
    assert res.get('user', {}).get('name') == 'Santhosh Reddy'
    assert res.get('token') is not None
    print(f"✓ Steps 8-10 Passed: LOGIN SUCCESS! No name requested. Name retrieved: '{res['user']['name']}'. User enters MediaForge.")

    # -------------------------------------------------------------
    # Sequence 2: USER001 on Mobile B (Steps 11 to 19)
    # -------------------------------------------------------------
    mobile_b_id = "device_mobile_b_2222"
    mobile_b_info = {
        'friendlyName': 'Android Phone',
        'deviceType': 'Mobile',
        'os': 'Android',
        'browser': 'Chrome'
    }

    print("\n[Step 11-13] USER001 logs in from Mobile B (Device B unknown)...")
    status, res = post_json('/api/auth/login', {
        'userId': 'USER001',
        'password': 'User001Pass!',
        'deviceId': mobile_b_id,
        'deviceInfo': mobile_b_info
    })
    assert status == 403
    assert res.get('code') == 'NEW_DEVICE_DETECTED'
    print("✓ Steps 11-13 Passed: Credentials correct, Mobile B is new device, Name screen appears.")

    print("\n[Step 14-16] User submits name 'Santhosh Reddy' for Mobile B...")
    status, res = post_json('/api/auth/request-device-approval', {
        'userId': 'USER001',
        'name': 'Santhosh Reddy',
        'deviceId': mobile_b_id,
        'deviceInfo': mobile_b_info
    })
    assert status == 200

    # User remains blocked
    status, res = post_json('/api/auth/login', {
        'userId': 'USER001',
        'password': 'User001Pass!',
        'deviceId': mobile_b_id,
        'deviceInfo': mobile_b_info
    })
    assert status == 403 and res.get('code') == 'APPROVAL_PENDING'
    print("✓ Steps 14-16 Passed: Admin receives Mobile B request, user remains blocked.")

    print("\n[Step 17] Admin approves Mobile B...")
    status, res = get_json('/api/admin/device-requests', admin_token)
    mobile_b_req = next((r for r in res.get('requests', []) if r['deviceId'] == mobile_b_id), None)
    assert mobile_b_req is not None
    status, res = post_json('/api/admin/device-requests/approve', {
        'requestId': mobile_b_req['requestId'],
        'deviceId': mobile_b_id,
        'userId': 'USER001'
    }, admin_token)
    assert status == 200 and res.get('success') is True
    print("✓ Step 17 Passed: Admin approved Mobile B.")

    print("\n[Step 18-19] USER001 logs in from Mobile B...")
    status, res = post_json('/api/auth/login', {
        'userId': 'USER001',
        'password': 'User001Pass!',
        'deviceId': mobile_b_id,
        'deviceInfo': mobile_b_info
    })
    assert status == 200
    assert res.get('success') is True
    print("✓ Steps 18-19 Passed: Mobile B recognized and approved. Direct login, no name asked.")

    # -------------------------------------------------------------
    # Sequence 3: USER001 on Device C (3rd Device Block) (Steps 20 to 24)
    # -------------------------------------------------------------
    device_c_id = "device_tablet_c_3333"
    device_c_info = {
        'friendlyName': 'iPad Tablet',
        'deviceType': 'Tablet',
        'os': 'iPadOS',
        'browser': 'Safari'
    }

    print("\n[Step 20-24] USER001 attempts login from 3rd device (Device C)...")
    status, res = post_json('/api/auth/login', {
        'userId': 'USER001',
        'password': 'User001Pass!',
        'deviceId': device_c_id,
        'deviceInfo': device_c_info
    })
    print(f"Status: {status}, Code: {res.get('code')}, Error: {res.get('error')}")
    assert status == 403
    assert res.get('code') == 'DEVICE_LIMIT_REACHED'
    assert '2 approved devices' in res.get('error', '')
    print("✓ Steps 20-24 Passed: Device C strictly blocked: 2 approved devices already reached!")

    # -------------------------------------------------------------
    # Sequence 4: Revocation of Laptop A (Steps 25 to 28)
    # -------------------------------------------------------------
    print("\n[Step 25] Admin revokes Laptop A...")
    status, res = post_json('/api/admin/devices/revoke', {
        'userId': 'USER001',
        'deviceId': laptop_a_id
    }, admin_token)
    assert status == 200 and res.get('success') is True
    print("✓ Step 25 Passed: Laptop A access revoked.")

    print("\n[Step 26-28] Laptop A attempts login with correct ID and password...")
    status, res = post_json('/api/auth/login', {
        'userId': 'USER001',
        'password': 'User001Pass!',
        'deviceId': laptop_a_id,
        'deviceInfo': laptop_a_info
    })
    print(f"Status: {status}, Code: {res.get('code')}, Error: {res.get('error')}")
    assert status == 403
    assert res.get('code') == 'DEVICE_REVOKED'
    assert 'revoked by the administrator' in res.get('error', '')
    print("✓ Steps 26-28 Passed: Laptop A blocked because device is revoked.")

    # -------------------------------------------------------------
    # Sequence 5: Login History & Security Events Audit (Steps 29 to 30)
    # -------------------------------------------------------------
    print("\n[Step 29] Admin opens Login History...")
    status, res = get_json('/api/admin/login-history', admin_token)
    assert status == 200
    history = res.get('history', [])
    assert len(history) > 0
    print(f"✓ Step 29 Passed: Received {len(history)} login history entries.")

    print("\n[Step 30] Verifying fields for SUCCESS, BLOCKED, PENDING, and REVOKED events...")
    found_success = False
    found_blocked_new_device = False
    found_blocked_limit = False
    found_blocked_revoked = False

    for item in history:
        assert 'userId' in item
        assert 'name' in item
        assert 'device' in item
        assert 'time' in item
        assert 'status' in item
        assert 'reason' in item
        if item['status'] == 'SUCCESS':
            found_success = True
        if item['status'] == 'BLOCKED' and 'Approval Required' in item['reason']:
            found_blocked_new_device = True
        if item['status'] == 'BLOCKED' and 'Device limit reached' in item['reason']:
            found_blocked_limit = True
        if item['status'] == 'BLOCKED' and 'Device Revoked' in item['reason']:
            found_blocked_revoked = True

    assert found_success, "Missing SUCCESS entry in Login History"
    assert found_blocked_new_device, "Missing BLOCKED New Device entry in Login History"
    assert found_blocked_limit, "Missing BLOCKED Device limit entry in Login History"
    assert found_blocked_revoked, "Missing BLOCKED Revoked Device entry in Login History"

    # Also verify security events
    status, res = get_json('/api/admin/security-events', admin_token)
    assert status == 200
    events = res.get('events', [])
    event_types = {e['eventType'] for e in events}
    print(f"Recorded Security Event Types: {event_types}")

    expected_events = {
        'New device detected',
        'Name submitted',
        'Approval requested',
        'Device approved',
        'Device revoked',
        'Successful login',
        'Blocked login',
        'Device limit reached'
    }
    for ev in expected_events:
        assert ev in event_types, f"Expected event type '{ev}' was not recorded!"

    print("✓ Step 30 Passed: Every event properly recorded with full metadata!")

    print("\n" + "=" * 70)
    print("🎉 ALL 30 ACCEPTANCE TEST STEPS PASSED SUCCESSFULLY!")
    print("=" * 70)

if __name__ == '__main__':
    run_test()
