# Repository guidance

## UI consistency

- Controls placed on the same row must share an outer height and align on the same axis. Use 40px as the default control height unless the component or context requires another size; do not let differing content or padding create accidental mismatches.
- Keep a clear vertical rhythm in forms and dialogs: use 24–32px between distinct sections and 12–16px between related fields. Group related settings and set spacing explicitly instead of relying on browser-default margins.
- Place current-value and helper text next to the control they describe; avoid leaving it visually detached between unrelated sections.
- Avoid `!important`. First resolve style conflicts through component variants, selector scope/specificity, or removal of the conflicting rule; use `!important` only as a documented last resort when those approaches cannot reliably control third-party or accessibility-critical styles.
