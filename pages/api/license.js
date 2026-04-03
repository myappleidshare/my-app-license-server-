const crypto = require('crypto');

// 模拟数据库（⚠️ 重要：Vercel Serverless 重启会丢失数据，下面会说怎么解决）
const licenses = new Map();

module.exports = async function handler(req, res) {
  const { action, machineCode, licenseKey } = req.body;

  // 你在本地生成激活码后，调用此接口存入云端
  if (action === 'create') {
    if (licenses.has(licenseKey)) {
      return res.json({ success: false, reason: '激活码已存在' });
    }
    licenses.set(licenseKey, { used: false, machine: null });
    return res.json({ success: true });
  }

  // 用户激活时调用此接口
  if (action === 'verify') {
    const data = licenses.get(licenseKey);

    // 激活码不存在
    if (!data) return res.json({ valid: false, reason: '激活码无效' });

    // 已绑定其他机器
    if (data.used && data.machine !== machineCode) {
      return res.json({ valid: false, reason: '激活码已被其他设备使用' });
    }

    // 第一次使用：绑定机器码
    if (!data.used) {
      data.used = true;
      data.machine = machineCode;
    }

    return res.json({ valid: true });
  }
};
