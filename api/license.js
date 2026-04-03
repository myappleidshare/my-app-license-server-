const { Redis } = require('@upstash/redis');

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

module.exports = async function handler(req, res) {
  let action, licenseKey;

  if (req.method === 'POST') {
    action = req.body?.action;
    licenseKey = req.body?.licenseKey;
  } else {
    action = req.query?.action;
    licenseKey = req.query?.licenseKey;
  }

  if (action === 'create') {
    await redis.set(`license:${licenseKey}`, 'unused');
    return res.status(200).json({ success: true, licenseKey });
  }

  if (action === 'verify') {
    const status = await redis.get(`license:${licenseKey}`);
    if (!status) return res.status(200).json({ success: false, reason: '无效激活码' });
    if (status === 'used') return res.status(200).json({ success: false, reason: '已被使用' });
    await redis.set(`license:${licenseKey}`, 'used');
    return res.status(200).json({ success: true });
  }

  return res.status(200).json({ success: false, reason: '未知操作' });
};
