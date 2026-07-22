/**
 * Miaomiaowu template presets (ACL4SSR + Aethersailor .ini sources).
 * Labels mirror miaomiaowu/src/lib/template-presets.ts
 */

export const AETHERSAILOR_PRESETS = [
    {
        id: 'Custom_Clash',
        label: 'Aethersailor - 标准 (推荐使用)',
        url: 'https://raw.githubusercontent.com/iluobei/Custom_OpenClash_Rules/refs/heads/main/cfg/Custom_Clash.ini',
    },
    {
        id: 'Custom_Clash_Full',
        label: 'Aethersailor - 全分组 (节点较多)',
        url: 'https://raw.githubusercontent.com/iluobei/Custom_OpenClash_Rules/refs/heads/main/cfg/Custom_Clash_Full.ini',
    },
    {
        id: 'Custom_Clash_GFW',
        label: 'Aethersailor - 极简 (GFW)',
        url: 'https://raw.githubusercontent.com/iluobei/Custom_OpenClash_Rules/refs/heads/main/cfg/Custom_Clash_GFW.ini',
    },
    {
        id: 'Custom_Clash_Lite',
        label: 'Aethersailor - 轻量 (国内直连，国外代理)',
        url: 'https://raw.githubusercontent.com/iluobei/Custom_OpenClash_Rules/refs/heads/main/cfg/Custom_Clash_Lite.ini',
    },
];

export const ACL4SSR_PRESETS = [
    {
        id: 'sublinkPro作者自用',
        label: 'sublinkPro作者自用 - 不区分国家',
        url: 'https://raw.githubusercontent.com/ZeroDeng01/ACL4SSR/master/Clash/config/ACL4SSR_Online_Full_NoCountry.ini',
    },
    {
        id: 'ACL4SSR',
        label: '标准版 - 典型分组',
        url: 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/config/ACL4SSR.ini',
    },
    {
        id: 'ACL4SSR_AdblockPlus',
        label: '标准版 - 典型分组+去广告',
        url: 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/config/ACL4SSR_AdblockPlus.ini',
    },
    {
        id: 'ACL4SSR_BackCN',
        label: '回国版 - 回国专用',
        url: 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/config/ACL4SSR_BackCN.ini',
    },
    {
        id: 'ACL4SSR_Mini',
        label: '精简版 - 少量分组',
        url: 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/config/ACL4SSR_Mini.ini',
    },
    {
        id: 'ACL4SSR_Mini_Fallback',
        label: '精简版 - 故障转移',
        url: 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/config/ACL4SSR_Mini_Fallback.ini',
    },
    {
        id: 'ACL4SSR_Mini_MultiMode',
        label: '精简版 - 多模式 (自动/手动)',
        url: 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/config/ACL4SSR_Mini_MultiMode.ini',
    },
    {
        id: 'ACL4SSR_Mini_NoAuto',
        label: '精简版 - 无自动测速',
        url: 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/config/ACL4SSR_Mini_NoAuto.ini',
    },
    {
        id: 'ACL4SSR_NoApple',
        label: '无苹果 - 无苹果分流',
        url: 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/config/ACL4SSR_NoApple.ini',
    },
    {
        id: 'ACL4SSR_NoAuto',
        label: '无测速 - 无自动测速',
        url: 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/config/ACL4SSR_NoAuto.ini',
    },
    {
        id: 'ACL4SSR_NoAuto_NoApple',
        label: '无测速&苹果 - 无测速&无苹果分流',
        url: 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/config/ACL4SSR_NoAuto_NoApple.ini',
    },
    {
        id: 'ACL4SSR_NoAuto_NoApple_NoMicrosoft',
        label: '无测速&苹果&微软 - 无测速&无苹果&无微软分流',
        url: 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/config/ACL4SSR_NoAuto_NoApple_NoMicrosoft.ini',
    },
    {
        id: 'ACL4SSR_NoMicrosoft',
        label: '无微软 - 无微软分流',
        url: 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/config/ACL4SSR_NoMicrosoft.ini',
    },
    {
        id: 'ACL4SSR_Online',
        label: '在线版 - 典型分组',
        url: 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/config/ACL4SSR_Online.ini',
    },
    {
        id: 'ACL4SSR_Online_AdblockPlus',
        label: '在线版 - 典型分组+去广告',
        url: 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/config/ACL4SSR_Online_AdblockPlus.ini',
    },
    {
        id: 'ACL4SSR_Online_Full',
        label: '在线全分组 - 比较全',
        url: 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/config/ACL4SSR_Online_Full.ini',
    },
    {
        id: 'ACL4SSR_Online_Full_AdblockPlus',
        label: '在线全分组 - 带广告拦截',
        url: 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/config/ACL4SSR_Online_Full_AdblockPlus.ini',
    },
    {
        id: 'ACL4SSR_Online_Full_Google',
        label: '在线全分组 - 谷歌分流',
        url: 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/config/ACL4SSR_Online_Full_Google.ini',
    },
    {
        id: 'ACL4SSR_Online_Full_MultiMode',
        label: '在线全分组 - 多模式',
        url: 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/config/ACL4SSR_Online_Full_MultiMode.ini',
    },
    {
        id: 'ACL4SSR_Online_Full_Netflix',
        label: '在线全分组 - 奈飞分流',
        url: 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/config/ACL4SSR_Online_Full_Netflix.ini',
    },
    {
        id: 'ACL4SSR_Online_Full_NoAuto',
        label: '在线全分组 - 无自动测速',
        url: 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/config/ACL4SSR_Online_Full_NoAuto.ini',
    },
    {
        id: 'ACL4SSR_Online_Mini',
        label: '在线精简版 - 少量分组',
        url: 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/config/ACL4SSR_Online_Mini.ini',
    },
    {
        id: 'ACL4SSR_Online_Mini_AdblockPlus',
        label: '在线精简版 - 带广告拦截',
        url: 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/config/ACL4SSR_Online_Mini_AdblockPlus.ini',
    },
    {
        id: 'ACL4SSR_Online_Mini_Ai',
        label: '在线精简版 - AI',
        url: 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/config/ACL4SSR_Online_Mini_Ai.ini',
    },
    {
        id: 'ACL4SSR_Online_Mini_Fallback',
        label: '在线精简版 - 故障转移',
        url: 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/config/ACL4SSR_Online_Mini_Fallback.ini',
    },
    {
        id: 'ACL4SSR_Online_Mini_MultiCountry',
        label: '在线精简版 - 多国家',
        url: 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/config/ACL4SSR_Online_Mini_MultiCountry.ini',
    },
    {
        id: 'ACL4SSR_Online_Mini_MultiMode',
        label: '在线精简版 - 多模式',
        url: 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/config/ACL4SSR_Online_Mini_MultiMode.ini',
    },
    {
        id: 'ACL4SSR_Online_Mini_NoAuto',
        label: '在线精简版 - 无自动测速',
        url: 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/config/ACL4SSR_Online_Mini_NoAuto.ini',
    },
    {
        id: 'ACL4SSR_Online_MultiCountry',
        label: '在线版 - 多国家',
        url: 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/config/ACL4SSR_Online_MultiCountry.ini',
    },
    {
        id: 'ACL4SSR_Online_NoAuto',
        label: '在线版 - 无自动测速',
        url: 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/config/ACL4SSR_Online_NoAuto.ini',
    },
    {
        id: 'ACL4SSR_Online_NoReject',
        label: '在线版 - 无拒绝规则',
        url: 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/config/ACL4SSR_Online_NoReject.ini',
    },
    {
        id: 'ACL4SSR_WithChinaIp',
        label: '特殊版 - 包含回国IP',
        url: 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/config/ACL4SSR_WithChinaIp.ini',
    },
    {
        id: 'ACL4SSR_WithChinaIp_WithGFW',
        label: '特殊版 - 包含回国IP&GFW列表',
        url: 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/config/ACL4SSR_WithChinaIp_WithGFW.ini',
    },
    {
        id: 'ACL4SSR_WithGFW',
        label: '特殊版 - 包含GFW列表',
        url: 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/config/ACL4SSR_WithGFW.ini',
    },
];

export const ALL_INI_PRESETS = [...AETHERSAILOR_PRESETS, ...ACL4SSR_PRESETS];

/** Normalize template id for lookup (casefold, spaces → underscore). */
export function normalizeTemplateId(id) {
    return String(id || '')
        .trim()
        .toLowerCase()
        .replace(/[\s-]+/g, '_')
        .replace(/__+/g, '_');
}
