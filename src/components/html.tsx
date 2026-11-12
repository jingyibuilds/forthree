// Authored curriculum copy carries a little inline markup — `<span class="mo">`
// for a command, `<b>` for the measured line in a compare pane, a `<pre>` for a
// program a prediction is about. It is committed content in this repository,
// never anything a learner or a model wrote.
export function Html({text}: {text?: string}) {
  return <span className="html" dangerouslySetInnerHTML={{__html: text ?? ""}} />;
}
