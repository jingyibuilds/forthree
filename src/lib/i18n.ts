import { cookies } from "next/headers";

export type Locale = "en" | "zh";

export async function getLocale(): Promise<Locale> {
  const value = (await cookies()).get("locale")?.value;
  return value === "zh" ? "zh" : "en";
}

// UI strings. Rule (docs/DECISIONS.md): every surface renders fully in one
// language — never mixed labels. Technical terms may keep English originals
// inside Chinese text.
export const dict = {
  en: {
    name: "For Three",
    tagline: "Learning for real.",
    signIn: "Sign in",
    signOut: "Sign out",
    hello: "Hello, authenticated world. 👋",
    phaseNote: "Phase 0 complete. Learning arrives in Phase 1.",
    email: "Email",
    inviteCode: "Invite code",
    inviteHint: "(first signup only)",
    send: "Send magic link",
    sending: "Sending…",
    linkInvalid:
      "That link was invalid or expired. Request a new one — and open it in the same browser you request it from (if your email lives in another browser, copy the link address and paste it into this one).",
    toggleLabel: "中文",
    continueLearning: "Continue learning",
    yourPath: "Your path",
    start: "Start",
    review: "Review",
    done: "Done",
    minutes: "min",
    check: "Check",
    next: "Next",
    correct: "Correct",
    incorrect: "Not quite — try again",
    typeAnswer: "Type your answer",
    lessonDone: "Lesson complete",
    backToPath: "Back to your path",
    xpNotSaved: "(XP not saved — database migration 0002 pending)",
    termBadge: "Term drill · answer in English",
    back: "Back",
    anchorLabel: "Anchor",
  },
  zh: {
    name: "反三",
    tagline: "学点真本事",
    signIn: "登录",
    signOut: "退出登录",
    hello: "你好,已登录的世界 👋",
    phaseNote: "Phase 0 完成,学习功能从 Phase 1 开始。",
    email: "邮箱",
    inviteCode: "邀请码",
    inviteHint: "(仅首次注册需要)",
    send: "发送登录链接",
    sending: "发送中…",
    linkInvalid:
      "登录链接无效或已失效。请重新发送一个,并在发起登录的同一个浏览器里打开(邮箱在别的浏览器时,复制链接地址粘贴到这边的地址栏)。",
    toggleLabel: "EN",
    continueLearning: "继续学习",
    yourPath: "学习路径",
    start: "开始",
    review: "回顾",
    done: "已完成",
    minutes: "分钟",
    check: "检查",
    next: "下一步",
    correct: "答对了",
    incorrect: "还不对,再想想",
    typeAnswer: "输入答案",
    lessonDone: "本课完成",
    backToPath: "回到学习路径",
    xpNotSaved: "(XP 暂未入库——数据库迁移 0002 待执行)",
    termBadge: "术语题 · 用英文回答——这个词在 agent 的世界里只有英文",
    back: "返回",
    anchorLabel: "锚点",
  },
} as const;

export type Dict = (typeof dict)[Locale];

// Messages produced by server actions, localized at call time.
export const actionMessages = {
  en: {
    enterEmail: "Please enter an email.",
    inviteRequired: "First-time signup requires a valid invite code.",
    sent: (email: string) => `Magic link sent to ${email}. Check your inbox.`,
  },
  zh: {
    enterEmail: "请输入邮箱。",
    inviteRequired: "首次注册需要正确的邀请码。",
    sent: (email: string) => `登录链接已发送到 ${email},请查收邮箱。`,
  },
} as const;
