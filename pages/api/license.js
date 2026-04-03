const crypto = require('crypto');
const { randomUUID } = require('crypto');

const licenses = new Map();
const SECRET_KEY = '换成你自己的32位以上的密钥';

module.exports = async function handler(req, res) {
  const { action, machineCode, licenseKey } = req.body;

  if (action === 'generate') {
    const productId = 'MYAPP_V1';
    const expireDate = '2027-12-31';

    const keyBody = randomUUID().replace(/-/g, '').toUpperCase().slice(0, 24);
    const payload = `${machineCode}|${productId}|${expireDate}`;

    const hmac = crypto.createHmac('sha256', SECRET_KEY);
    hmac.update(payload);
    const signature = hmac.digest('hex').toUpperCase().substring(0, 16);

    const meta = Buffer.from(payload).toString('base64');
    const key = `${keyBody}-${signature}|${meta}`;

    licenses.set(key, { used: false, machine: machineCode });
    res.json({ licenseKey: key });
  }

  if (action === 'verify') {
    const licenseData = licenses.get(licenseKey);
    if (!licenseData) return res.json({ valid: false, reason: '激活码不存在' });
    if (licenseData.used) return res.json({ valid: false, reason: '激活码已使用' });

    const payload = Buffer.from(licenseKey.split('|')[1], 'base64').toString('utf8');
    const [machineCodeCheck, productIdCheck, expireDateCheck] = payload.split('|');

    if (machineCodeCheck !== machineCode) {
      return res.json({ valid: false, reason: '机器不匹配' });
    }

    if (new Date() > new Date(expireDateCheck)) {
      return res.json({ valid: false, reason: '已过期' });
    }

    licenseData.used = true;
    res.json({ valid: true });
  }
}
