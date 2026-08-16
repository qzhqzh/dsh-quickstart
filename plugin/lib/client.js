// dsh-quickstart-plugin — browser half.
//
// Two-level structure inside 设置 → 插件 → 插件配置, mirroring the official
// PluginCard + field CSS exactly (values copied from the shipped plugins
// settings surface):
//
//   第一层  settings.plugin.item  「快速开始」卡片（和 web-search 等并列）
//     └─ 第二层  quickstart.config.item  具体配置项（当前：守护模式）
window.__ModuleLoader__.load({
  id: "dsh-quickstart-plugin",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
    const React = require("react");
    const { useState, useEffect } = React;

    const CONFIG_URL = "/api/dsh-quickstart/config";
    const RESTART_URL = "/api/dsh-quickstart/restart";

    // ---- 第一层卡片：与官方 PluginCard 一致的 CSS 值 -----------------
    const card = {
      border: "1px solid var(--dsw-alias-border-l2)",
      background: "var(--dsw-alias-bg-layer-3)",
      borderRadius: 12,
      listStyle: "none",
      margin: 0,
      padding: 0,
      transition: "border-color .16s, background .16s",
    };
    const cardOpen = {
      background: "var(--dsw-alias-bg-layer-2)",
      borderColor: "var(--dsw-alias-label-dimmed)",
    };
    const header = {
      appearance: "none",
      width: "100%",
      color: "inherit",
      font: "inherit",
      textAlign: "left",
      cursor: "pointer",
      background: "transparent",
      border: 0,
      borderRadius: 12,
      alignItems: "center",
      gap: 12,
      padding: "14px 16px",
      display: "flex",
    };
    const headText = { flexDirection: "column", flex: 1, gap: 4, minWidth: 0, display: "flex" };
    const name = { color: "var(--dsw-alias-label-primary)", fontSize: 15, fontWeight: 600, lineHeight: 1.4 };
    const description = { color: "var(--dsw-alias-label-tertiary)", fontSize: 13, lineHeight: 1.5 };
    const chevron = { color: "var(--dsw-alias-label-tertiary)", flex: "none", transition: "transform .16s" };
    const body = { borderTop: "1px solid var(--dsw-alias-border-l2)", margin: "0 16px", padding: "12px 0 8px" };
    const subList = { flexDirection: "column", gap: 10, margin: 0, padding: 0, listStyle: "none", display: "flex" };

    // ---- 第二层字段：与官方 field 一致的 CSS 值 ---------------------
    const field = { flexDirection: "column", gap: 6, padding: "12px 0", display: "flex" };
    const fieldHead = { alignItems: "center", gap: 8, display: "flex" };
    const fieldLabel = { minWidth: 0, color: "var(--dsw-alias-label-primary)", flex: 1, fontSize: 13, fontWeight: 500, lineHeight: 1.5 };
    const badge = { whiteSpace: "nowrap", background: "var(--dsw-alias-bg-module-platform)", color: "var(--dsw-alias-label-secondary)", borderRadius: 999, padding: "1px 8px", fontSize: 11, fontWeight: 500, lineHeight: "17px" };
    const badgeOn = { ...badge, color: "var(--dsw-alias-label-primary)" };
    const fieldHint = { color: "var(--dsw-alias-label-tertiary)", margin: 0, fontSize: 12, lineHeight: 1.5 };

    // 布尔开关：官方无布尔字段，用 switch 作为布尔控件，视觉沿用官方 input 的边框/圆角。
    const switchTrack = {
      position: "relative",
      width: 40,
      height: 22,
      borderRadius: 999,
      border: "1px solid var(--dsw-alias-border-l2)",
      background: "var(--dsw-alias-bg-layer-3)",
      cursor: "pointer",
      flex: "none",
      alignSelf: "flex-start",
    };
    const switchKnob = {
      position: "absolute",
      top: 2,
      width: 16,
      height: 16,
      borderRadius: "50%",
      background: "var(--dsw-alias-label-primary)",
      transition: "left .15s ease",
    };

    const confirmBar = {
      display: "flex",
      flexDirection: "column",
      gap: 8,
      padding: "10px 12px",
      borderRadius: 8,
      border: "1px solid var(--dsw-alias-border-l2)",
      background: "var(--dsw-alias-bg-layer-3)",
      fontSize: 12,
      lineHeight: "18px",
      color: "var(--dsw-alias-label-primary)",
    };
    const confirmActions = { display: "flex", gap: 8, justifyContent: "flex-end" };
    const btnBase = { padding: "4px 12px", borderRadius: 6, border: "1px solid var(--dsw-alias-border-l2)", cursor: "pointer", fontSize: 12 };
    const btnPrimary = { ...btnBase, background: "var(--dsw-alias-interactive-bg-active, var(--dsw-alias-interactive-bg-hover))", color: "var(--dsw-alias-label-primary)", fontWeight: 600 };
    const btnSecondary = { ...btnBase, background: "transparent", color: "var(--dsw-alias-label-secondary)" };
    const note = { fontSize: 12, lineHeight: "18px", color: "var(--dsw-alias-label-tertiary)" };

    function ChevronIcon({ open }) {
      // 与官方 IconChevronDownOutline14 完全一致的 path。
      return React.createElement("svg", {
        width: 14,
        height: 14,
        viewBox: "0 0 14 14",
        fill: "none",
        xmlns: "http://www.w3.org/2000/svg",
        style: { ...chevron, transform: open ? "rotate(180deg)" : "none" },
      }, React.createElement("path", {
        d: "M11.8486 5.5L11.4238 5.92383L8.69727 8.65137C8.44157 8.90706 8.21562 9.13382 8.01172 9.29785C7.79912 9.46883 7.55595 9.61756 7.25 9.66602C7.08435 9.69222 6.91565 9.69222 6.75 9.66602C6.44405 9.61756 6.20088 9.46883 5.98828 9.29785C5.78438 9.13382 5.55843 8.90706 5.30273 8.65137L2.57617 5.92383L2.15137 5.5L3 4.65137L3.42383 5.07617L6.15137 7.80273C6.42595 8.07732 6.59876 8.24849 6.74023 8.3623C6.87291 8.46904 6.92272 8.47813 6.9375 8.48047C6.97895 8.48703 7.02105 8.48703 7.0625 8.48047C7.07728 8.47813 7.12709 8.46904 7.25977 8.3623C7.40124 8.24849 7.57405 8.07732 7.84863 7.80273L10.5762 5.07617L11 4.65137L11.8486 5.5Z",
        fill: "currentColor",
      }));
    }

    // ---- 第一层：快速开始卡片 -----------------------------------------
    function QuickStartCard(props) {
      const renderSlot = props && props.renderSlot;
      const [open, setOpen] = useState(false);
      return React.createElement("li", { style: open ? { ...card, ...cardOpen } : card },
        React.createElement("button", {
          type: "button",
          style: header,
          "aria-expanded": open,
          onClick: () => setOpen(!open),
        },
          React.createElement("span", { style: headText },
            React.createElement("span", { style: name }, "快速开始"),
            React.createElement("span", { style: description }, "dsh-quickstart 启动器配置"),
          ),
          React.createElement(ChevronIcon, { open }),
        ),
        open && typeof renderSlot === "function"
          ? React.createElement("div", { style: body },
              React.createElement("ul", { style: subList }, renderSlot("quickstart.config.item", {})),
            )
          : null,
      );
    }

    // ---- 第二层：守护模式配置 -----------------------------------------
    function WatchdogConfig() {
      const [config, setConfig] = useState(null);
      const [confirming, setConfirming] = useState(null); // "on" | "off" | null
      const [busy, setBusy] = useState(false);
      const [noteText, setNoteText] = useState("");

      const load = async () => {
        try {
          const res = await fetch(CONFIG_URL, { cache: "no-store" });
          const body = await res.json();
          setConfig((body && body.config) || {});
        } catch {
          setConfig({});
        }
      };
      useEffect(() => { load(); }, []);

      const watch = config ? config.watch === true : false;

      const requestToggle = () => {
        setNoteText("");
        setConfirming(watch ? "off" : "on");
      };
      const cancelConfirm = () => setConfirming(null);
      const confirmToggle = async () => {
        const target = confirming === "on";
        setBusy(true);
        setNoteText(target ? "已开启守护模式，正在重启 dsh…" : "已关闭守护模式，正在重启 dsh…");
        try {
          await fetch(CONFIG_URL, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ watch: target }),
          });
          setConfig((prev) => ({ ...(prev || {}), watch: target }));
          await fetch(RESTART_URL, { method: "POST" });
        } catch (error) {
          setNoteText("操作失败：" + (error && error.message ? error.message : String(error)));
        } finally {
          setBusy(false);
          setConfirming(null);
        }
      };

      return React.createElement("li", { style: { listStyle: "none", margin: 0, padding: 0 } },
        React.createElement("div", { style: field },
          React.createElement("div", { style: fieldHead },
            React.createElement("label", { style: fieldLabel }, "守护模式"),
            React.createElement("span", { style: watch ? badgeOn : badge }, watch ? "已开启" : "已关闭"),
          ),
          React.createElement("button", {
            type: "button",
            role: "switch",
            "aria-checked": watch,
            "aria-label": watch ? "关闭守护模式" : "开启守护模式",
            disabled: busy,
            style: { ...switchTrack, background: watch ? "var(--dsw-alias-interactive-bg-active, var(--dsw-alias-interactive-bg-hover))" : switchTrack.background },
            onClick: requestToggle,
          }, React.createElement("span", { style: { ...switchKnob, left: watch ? 20 : 2 } })),
          React.createElement("p", { style: fieldHint },
            "守护模式由 dsh-quickstart 启动器执行：开启后，dsh 进程崩溃或被要求重启时，启动器会自动把它拉起来。"),
          confirming !== null
            ? React.createElement("div", { style: confirmBar },
                React.createElement("div", {},
                  confirming === "on"
                    ? "开启守护模式将自动重启一次 dsh，当前会话会中断，请确认继续。"
                    : "关闭守护模式同样会自动重启一次 dsh，当前会话会中断，请确认继续。"),
                React.createElement("div", { style: confirmActions },
                  React.createElement("button", { type: "button", style: btnSecondary, onClick: cancelConfirm, disabled: busy }, "取消"),
                  React.createElement("button", { type: "button", style: btnPrimary, onClick: confirmToggle, disabled: busy },
                    busy ? "处理中…" : "确认并重启"),
                ),
              )
            : null,
          noteText ? React.createElement("div", { style: note }, noteText) : null,
        ),
      );
    }

    const inject = ["slots"];

    function apply(ctx) {
      // 第一层：插件配置列表里的一张卡片，声明自己的配置项子 slot。
      ctx.slots.inject("settings.plugin.item", () => ctx.slots.register({
        name: "settings.plugin.item",
        id: "quickstart",
        order: 30,
        label: "快速开始",
        children: {
          "quickstart.config.item": { kind: "list", scope: "root" },
        },
      }, QuickStartCard));

      // 第二层：守护模式配置项，注册进上方的子 slot。
      ctx.slots.inject("quickstart.config.item", () => ctx.slots.register({
        name: "quickstart.config.item",
        id: "watchdog",
        order: 0,
        label: "守护模式",
      }, WatchdogConfig));
    }

    exports.apply = apply;
    exports.inject = inject;
    return module.exports;
  },
});
