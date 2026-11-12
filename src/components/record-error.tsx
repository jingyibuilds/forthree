import Shell from "./shell";

/** §19.0: a file the app cannot read is named on the screen, with the rest of
 *  the semester declared intact — never an unhandled crash. */
export default function RecordError({active, message}: {active: "/" | "/curriculum" | "/board"; message: string}) {
  return (
    <Shell active={active}>
      <h1>Your record could not be read</h1>
      <p className="inline miss" role="alert">{message}</p>
      <p className="after">Nothing was overwritten, and the rest of the semester is intact.</p>
    </Shell>
  );
}
