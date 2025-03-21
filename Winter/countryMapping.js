// 国家名称到国家代码的映射表
const countryCodeMapping = [
  { 阿富汗: "af" },
  { 阿尔巴尼亚: "al" },
  { 阿尔及利亚: "dz" },
  { 安道尔: "ad" },
  { 安哥拉: "ao" },
  { 安提瓜和巴布达: "ag" },
  { 阿根廷: "ar" },
  { 亚美尼亚: "am" },
  { 澳大利亚: "au" },
  { 奥地利: "at" },
  { 阿塞拜疆: "az" },
  { 巴哈马: "bs" },
  { 巴林: "bh" },
  { 孟加拉国: "bd" },
  { 巴巴多斯: "bb" },
  { 白俄罗斯: "by" },
  { 比利时: "be" },
  { 伯利兹: "bz" },
  { 贝宁: "bj" },
  { 不丹: "bt" },
  { 玻利维亚: "bo" },
  { 波斯尼亚和黑塞哥维那: "ba" },
  { 博茨瓦纳: "bw" },
  { 巴西: "br" },
  { 文莱: "bn" },
  { 保加利亚: "bg" },
  { 布基纳法索: "bf" },
  { 布隆迪: "bi" },
  { 柬埔寨: "kh" },
  { 喀麦隆: "cm" },
  { 加拿大: "ca" },
  { 佛得角: "cv" },
  { 中非共和国: "cf" },
  { 乍得: "td" },
  { 智利: "cl" },
  { 中国: "cn" },
  { 哥伦比亚: "co" },
  { 科摩罗: "km" },
  { 刚果: "cg" },
  { 刚果民主共和国: "cd" },
  { 哥斯达黎加: "cr" },
  { 科特迪瓦: "ci" },
  { 克罗地亚: "hr" },
  { 古巴: "cu" },
  { 塞浦路斯: "cy" },
  { 捷克共和国: "cz" },
  { 丹麦: "dk" },
  { 吉布提: "dj" },
  { 多米尼克: "dm" },
  { 多米尼加共和国: "do" },
  { 厄瓜多尔: "ec" },
  { 埃及: "eg" },
  { 萨尔瓦多: "sv" },
  { 赤道几内亚: "gq" },
  { 厄立特里亚: "er" },
  { 爱沙尼亚: "ee" },
  { 埃塞俄比亚: "et" },
  { 斐济: "fj" },
  { 芬兰: "fi" },
  { 法国: "fr" },
  { 加蓬: "ga" },
  { 冈比亚: "gm" },
  { 格鲁吉亚: "ge" },
  { 德国: "de" },
  { 加纳: "gh" },
  { 希腊: "gr" },
  { 格林纳达: "gd" },
  { 危地马拉: "gt" },
  { 几内亚: "gn" },
  { 几内亚比绍: "gw" },
  { 圭亚那: "gy" },
  { 海地: "ht" },
  { 洪都拉斯: "hn" },
  { 匈牙利: "hu" },
  { 冰岛: "is" },
  { 印度: "in" },
  { 印度尼西亚: "id" },
  { 伊朗: "ir" },
  { 伊拉克: "iq" },
  { 爱尔兰: "ie" },
  { 以色列: "il" },
  { 意大利: "it" },
  { 牙买加: "jm" },
  { 日本: "jp" },
  { 约旦: "jo" },
  { 哈萨克斯坦: "kz" },
  { 肯尼亚: "ke" },
  { 基里巴斯: "ki" },
  { 韩国: "kr" },
  { 科威特: "kw" },
  { 吉尔吉斯斯坦: "kg" },
  { 老挝: "la" },
  { 拉脱维亚: "lv" },
  { 黎巴嫩: "lb" },
  { 莱索托: "ls" },
  { 利比里亚: "lr" },
  { 利比亚: "ly" },
  { 列支敦士登: "li" },
  { 立陶宛: "lt" },
  { 卢森堡: "lu" },
  { 马达加斯加: "mg" },
  { 马拉维: "mw" },
  { 马来西亚: "my" },
  { 马尔代夫: "mv" },
  { 马里: "ml" },
  { 马耳他: "mt" },
  { 马绍尔群岛: "mh" },
  { 毛里塔尼亚: "mr" },
  { 毛里求斯: "mu" },
  { 墨西哥: "mx" },
  { 密克罗尼西亚: "fm" },
  { 摩尔多瓦: "md" },
  { 摩纳哥: "mc" },
  { 蒙古: "mn" },
  { 黑山: "me" },
  { 摩洛哥: "ma" },
  { 莫桑比克: "mz" },
  { 缅甸: "mm" },
  { 纳米比亚: "na" },
  { 瑙鲁: "nr" },
  { 尼泊尔: "np" },
  { 荷兰: "nl" },
  { 新西兰: "nz" },
  { 尼加拉瓜: "ni" },
  { 尼日尔: "ne" },
  { 尼日利亚: "ng" },
  { 北马其顿: "mk" },
  { 挪威: "no" },
  { 阿曼: "om" },
  { 巴基斯坦: "pk" },
  { 帕劳: "pw" },
  { 巴拿马: "pa" },
  { 巴布亚新几内亚: "pg" },
  { 巴拉圭: "py" },
  { 秘鲁: "pe" },
  { 菲律宾: "ph" },
  { 波兰: "pl" },
  { 葡萄牙: "pt" },
  { 卡塔尔: "qa" },
  { 罗马尼亚: "ro" },
  { 俄罗斯: "ru" },
  { 卢旺达: "rw" },
  { 圣基茨和尼维斯: "kn" },
  { 圣卢西亚: "lc" },
  { 圣文森特和格林纳丁斯: "vc" },
  { 萨摩亚: "ws" },
  { 圣马力诺: "sm" },
  { 圣多美和普林西比: "st" },
  { 沙特阿拉伯: "sa" },
  { 塞内加尔: "sn" },
  { 塞尔维亚: "rs" },
  { 塞舌尔: "sc" },
  { 塞拉利昂: "sl" },
  { 新加坡: "sg" },
  { 斯洛伐克: "sk" },
  { 斯洛文尼亚: "si" },
  { 所罗门群岛: "sb" },
  { 索马里: "so" },
  { 南非: "za" },
  { 南苏丹: "ss" },
  { 西班牙: "es" },
  { 斯里兰卡: "lk" },
  { 苏丹: "sd" },
  { 苏里南: "sr" },
  { 瑞典: "se" },
  { 瑞士: "ch" },
  { 叙利亚: "sy" },
  { 塔吉克斯坦: "tj" },
  { 坦桑尼亚: "tz" },
  { 泰国: "th" },
  { 东帝汶: "tl" },
  { 多哥: "tg" },
  { 汤加: "to" },
  { 特立尼达和多巴哥: "tt" },
  { 突尼斯: "tn" },
  { 土耳其: "tr" },
  { 土库曼斯坦: "tm" },
  { 图瓦卢: "tv" },
  { 乌干达: "ug" },
  { 乌克兰: "ua" },
  { 阿联酋: "ae" },
  { 英国: "uk" },
  { 美国: "us" },
  { 乌拉圭: "uy" },
  { 乌兹别克斯坦: "uz" },
  { 瓦努阿图: "vu" },
  { 梵蒂冈: "va" },
  { 委内瑞拉: "ve" },
  { 越南: "vn" },
  { 也门: "ye" },
  { 赞比亚: "zm" },
  { 津巴布韦: "zw" },
  // 特别行政区和其他地区
  { 中国香港: "hk" },
  { 中国澳门: "mo" },
  { 中国台湾: "tw" },
  { 波多黎各: "pr" },
  { 格陵兰: "gl" },
  { 法罗群岛: "fo" },
  { 直布罗陀: "gi" },
  { 关岛: "gu" },
  { 百慕大: "bm" },
  { 开曼群岛: "ky" },
];

// 根据国家名称获取国家代码的函数
function getCountryCode(countryName) {
  const mapping = countryCodeMapping.find(
    (item) => Object.keys(item)[0] === countryName
  );
  return mapping ? Object.values(mapping)[0] : "";
}

// 根据国家代码获取国家名称的函数
function getCountryName(countryCode) {
  const mapping = countryCodeMapping.find(
    (item) => Object.values(item)[0] === countryCode.toLowerCase()
  );
  return mapping ? Object.keys(mapping)[0] : "";
}
