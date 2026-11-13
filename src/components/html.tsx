// Authored curriculum copy carries a little inline markup — `<span class="mo">`
// for a command, `<b>` for the measured line in a compare pane, a `<pre>` for a
// program a prediction is about. It is committed content in this repository,
// never anything a learner or a model wrote.
export function Html({text}: {text?: string}) {
  return <span className="html" dangerouslySetInnerHTML={{__html: text ?? ""}} />;
}

// The same, for a string that came out of a study record rather than out of
// this repository. On the web trial a record is a file the visitor loaded, and
// "load my record to see where I got to" is a one-click delivery mechanism on
// the published domain: a hand-written `checks[].message` holding
// `<img src=x onerror=...>` would run on that origin.
//
// It escapes everything first and then re-admits a fixed list of complete
// tags. The order matters, and an earlier version that went the other way —
// matching tags and dropping the ones it did not know — was bypassable: its
// idea of where an attribute ended came from counting quotes, the parser's
// came from the `=` before them, and a quote in attribute-name position
// (`<img src=x " onerror=alert(1)>`) desynchronised the two, so the regex
// failed to match the tag at all and passed it through whole (architecture
// review, 2026-11-13, confirmed firing in Chrome). After escaping there is no
// `<` the parser can see except the ones emitted below, and each of those is
// written out in full here, so there is nothing left to desynchronise.
const KEEP = "span|b|i|em|strong|code|pre|br";
const TAG = new RegExp(`&lt;(/?)(${KEEP})(?: class=&quot;([A-Za-z0-9 _-]*)&quot;)?&gt;`, "gi");

export function sanitize(text: string) {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
  return escaped.replace(TAG, (_whole, closing: string, name: string, className?: string) =>
    closing
      ? `</${name.toLowerCase()}>`
      : `<${name.toLowerCase()}${className ? ` class="${className}"` : ""}>`);
}

export function HtmlFromRecord({text}: {text?: string}) {
  return <Html text={text === undefined ? undefined : sanitize(text)} />;
}
