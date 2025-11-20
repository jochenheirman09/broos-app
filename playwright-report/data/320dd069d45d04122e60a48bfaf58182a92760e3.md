# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - alert [ref=e2]: Broos 2.0
  - button "Open Next.js Dev Tools" [ref=e8] [cursor=pointer]:
    - img [ref=e9]
  - main [ref=e13]:
    - generic [ref=e15]:
      - generic [ref=e16]:
        - heading "Bijna klaar, Test Staff!" [level=3] [ref=e17]
        - paragraph [ref=e18]: Voltooi je profiel om verder te gaan.
      - generic [ref=e20]:
        - generic [ref=e21]:
          - generic [ref=e22]: Geboortedatum
          - button "Geboortedatum" [ref=e23] [cursor=pointer]:
            - generic [ref=e24]: Kies een datum
            - img [ref=e25]
        - generic [ref=e27]:
          - text: Team Uitnodigingscode
          - textbox "Team Uitnodigingscode" [ref=e28]:
            - /placeholder: ABCDEF
        - button "Profiel Opslaan" [ref=e29] [cursor=pointer]
  - region "Notifications (F8)":
    - list
```