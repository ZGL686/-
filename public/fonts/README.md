# Ludian 离线字体

## 简洁黑体 · Noto Sans SC

来源：[Google Fonts 官方仓库](https://github.com/google/fonts/tree/main/ofl/notosanssc)。下载日期：2026-09-20。

- 原文件：`NotoSansSC[wght].ttf`，17,772,300 字节。
- 交付：`NotoSansSC.woff2`，7,782,636 字节，使用 fontTools 转换容器格式。保留全部 30,890 个 Unicode 映射、100–900 可变字重；未按学生名单裁剪字体。
- CSS 家族别名：`GuiLu Sans`。字体内部名称仍为 Noto Sans SC。
- 许可：SIL Open Font License 1.1，完整文本见 `OFL.txt`。打包时与其余字体许可合并为 `FONT-LICENSE.txt`。
- 只从应用自身加载，不请求 Google Fonts CDN；极少数字体未收录的字会回退系统中文字体。

重建：从上述官方仓库取得原字体，使用 `fontTools.ttLib.TTFont` 加载，设置 `font.flavor = 'woff2'` 后保存，需要 brotli。转换不改变字形内容。

## 柔和圆体与手写文楷

- 柔和圆体：来自 [975 圆体](https://github.com/lxgw/975Yuan)，固定版本 `26.07.26`，使用 400W / 700W，各保留 30,912 个字符映射。
- 手写文楷：来自 [霞鹜文楷 GB 屏幕阅读版](https://github.com/lxgw/LxgwWenKai-Screen)，固定版本 `v1.522`，保留 47,449 个字符映射。
- 使用 fontTools 进行 WOFF2 转换，未按学生名单或界面文本裁剪；字形未改动。派生字体家族名改为 **Ludian Rounded** / **Ludian Hand**，保留源版权信息。手写字体只有常规字重，强调文字由浏览器合成加粗。
- 原版许可完整保留在 `rounded-OFL.txt`、`handwritten-OFL.txt`，均为 SIL OFL 1.1。来源和转换前后 SHA-256 记录在 `sources.json`。
- 可运行 `python scripts/prepare-fonts.py` 重建，需 `fonttools[woff]`；原始 TTF 缓存在忽略的 `.local/font-sources/`。不安装到系统字体目录。

应用只从本地资源加载字体，不接入字体 CDN。设备没有系统字体时自动回退内置黑体；罕见字符继续走完整内置 / 系统字体回退。
