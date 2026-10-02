import json

config_json = """{
  "darkMode": "class",
  "theme": {
    "extend": {
      "colors": {
        "on-tertiary-container": "#711419",
        "tertiary-container": "#fc7c78",
        "on-tertiary": "#ffffff",
        "tertiary-fixed-dim": "#ffb3af",
        "on-surface-variant": "#3c4a42",
        "primary": "#006c49",
        "surface-variant": "#dde4dd",
        "primary-fixed": "#6ffbbe",
        "surface-container-low": "#eef6ee",
        "on-error": "#ffffff",
        "surface-container-high": "#e3eae3",
        "on-secondary": "#ffffff",
        "on-secondary-fixed": "#001e2f",
        "error": "#ba1a1a",
        "primary-fixed-dim": "#4edea3",
        "primary-container": "#10b981",
        "on-surface": "#161d19",
        "outline": "#6c7a71",
        "secondary-container": "#39b8fd",
        "outline-variant": "#bbcabf",
        "on-secondary-container": "#004666",
        "on-tertiary-fixed-variant": "#842225",
        "secondary-fixed": "#c9e6ff",
        "inverse-surface": "#2b322d",
        "surface": "#f4fbf4",
        "surface-container-lowest": "#ffffff",
        "on-tertiary-fixed": "#410005",
        "tertiary": "#a43a3a",
        "inverse-primary": "#4edea3",
        "surface-container-highest": "#dde4dd",
        "surface-tint": "#006c49",
        "secondary-fixed-dim": "#89ceff",
        "surface-container": "#e8f0e9",
        "on-background": "#161d19",
        "on-primary-fixed": "#002113",
        "on-primary": "#ffffff",
        "on-secondary-fixed-variant": "#004c6e",
        "on-primary-container": "#00422b",
        "secondary": "#006591",
        "on-error-container": "#93000a",
        "on-primary-fixed-variant": "#005236",
        "surface-bright": "#f4fbf4",
        "surface-dim": "#d4dcd5",
        "tertiary-fixed": "#ffdad7",
        "background": "#f4fbf4",
        "inverse-on-surface": "#ebf3eb",
        "error-container": "#ffdad6"
      },
      "borderRadius": {
        "DEFAULT": "0.25rem",
        "lg": "0.5rem",
        "xl": "0.75rem",
        "full": "9999px"
      },
      "spacing": {
        "space-sm": "0.5rem",
        "space-md": "0.75rem",
        "margin-md": "1.5rem",
        "space-lg": "1rem",
        "space-xs": "0.25rem",
        "margin-lg": "2rem",
        "margin": "1rem",
        "gutter-lg": "1.5rem",
        "gutter": "1rem",
        "space-xl": "1.5rem"
      },
      "fontFamily": {
        "display-lg": [
          "Playfair Display"
        ],
        "headline-sm": [
          "Inter"
        ],
        "display-lg-mobile": [
          "Playfair Display"
        ],
        "label-md": [
          "Inter"
        ],
        "body-md": [
          "Inter"
        ],
        "body-lg": [
          "Inter"
        ],
        "headline-lg": [
          "Playfair Display"
        ],
        "headline-md": [
          "Inter"
        ],
        "label-sm": [
          "Inter"
        ],
        "label-lg": [
          "Inter"
        ],
        "body-sm": [
          "Inter"
        ]
      },
      "fontSize": {
        "display-lg": [
          "2.25rem",
          {
            "lineHeight": "2.75rem",
            "letterSpacing": "-0.02em",
            "fontWeight": "600"
          }
        ],
        "headline-sm": [
          "1rem",
          {
            "lineHeight": "1.5rem",
            "letterSpacing": "0",
            "fontWeight": "600"
          }
        ],
        "display-lg-mobile": [
          "1.75rem",
          {
            "lineHeight": "2.25rem",
            "letterSpacing": "-0.01em",
            "fontWeight": "600"
          }
        ],
        "label-md": [
          "0.75rem",
          {
            "lineHeight": "1rem",
            "letterSpacing": "0.05em",
            "fontWeight": "600"
          }
        ],
        "body-md": [
          "0.875rem",
          {
            "lineHeight": "1.25rem",
            "letterSpacing": "0",
            "fontWeight": "400"
          }
        ],
        "body-lg": [
          "1rem",
          {
            "lineHeight": "1.5rem",
            "letterSpacing": "0",
            "fontWeight": "400"
          }
        ],
        "headline-lg": [
          "1.75rem",
          {
            "lineHeight": "2.25rem",
            "letterSpacing": "-0.01em",
            "fontWeight": "500"
          }
        ],
        "headline-md": [
          "1.25rem",
          {
            "lineHeight": "1.75rem",
            "letterSpacing": "-0.01em",
            "fontWeight": "600"
          }
        ],
        "label-sm": [
          "0.6875rem",
          {
            "lineHeight": "0.875rem",
            "letterSpacing": "0.08em",
            "fontWeight": "700"
          }
        ],
        "label-lg": [
          "0.875rem",
          {
            "lineHeight": "1.25rem",
            "letterSpacing": "0.02em",
            "fontWeight": "600"
          }
        ],
        "body-sm": [
          "0.75rem",
          {
            "lineHeight": "1rem",
            "letterSpacing": "0.01em",
            "fontWeight": "400"
          }
        ]
      }
    }
  }
}"""

config = json.loads(config_json)
config["plugins"] = []
config["content"] = ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"]

with open("tailwind.config.js", "w", encoding="utf-8") as f:
    f.write("export default " + json.dumps(config, indent=2) + ";\n")
