const { Redis } = require('@upstash/redis');

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

function parseRecord(raw) {
  if (!raw) return null;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  return raw;
}

module.exports = async function handler(req, res) {
  const body = req.method === 'POST' ? (req.body || {}) : (req.query || {});
  const action = body.action;
  const licenseKey = body.licenseKey;
  const machineCode = body.machineCode;

  if (action === 'create') {
    if (!licenseKey) {
      return res.status(200).json({ success: false, reason: '缺少激活码' });
    }

    const record = {
      licenseKey,
      status: 'unused',
      machineCode: null,
      createdAt: new Date().toISOString(),
      activatedAt: null
    };

    await redis.set(`license:${licenseKey}`, JSON.stringify(record));
    return res.status(200).json({ success: true, licenseKey });
  }

  if (action === 'verify') {
    if (!licenseKey || !machineCode) {
      return res.status(200).json({ success: false, reason: '缺少激活码或机器码' });
    }

    const raw = await redis.get(`license:${licenseKey}`);
    const record = parseRecord(raw);

    if (!record) {
      return res.status(200).json({ success: false, reason: '无效激活码' });
    }

    if (record.status === 'unused') {
      record.status = 'used';
      record.machineCode = machineCode;
      record.activatedAt = new Date().toISOString();

      await redis.set(`license:${licenseKey}`, JSON.stringify(record));
      return res.status(200).json({
        success: true,
        firstBind: true,
        machineCode
      });
    }

    if (record.machineCode === machineCode) {
      return res.status(200).json({
        success: true,
        firstBind: false,
        machineCode
      });
    }

    return res.status(200).json({
      success: false,
      reason: '该激活码已绑定其他设备'
    });
  }

  if (action === 'status') {
    if (!licenseKey) {
      return res.status(200).json({ success: false, reason: '缺少激活码' });
    }

    const raw = await redis.get(`license:${licenseKey}`);
    const record = parseRecord(raw);

    if (!record) {
      return res.status(200).json({ success: false, reason: '无效激活码' });
    }

    return res.status(200).json({
      success: true,
      record
    });
  }

  return res.status(200).json({ success: false, reason: '未知操作' });
};
