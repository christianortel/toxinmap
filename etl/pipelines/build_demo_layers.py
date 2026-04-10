from pathlib import Path

import pandas as pd


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "data" / "processed" / "demo_signals.csv"


def main() -> None:
    rows = [
        {
            "signal_id": "signal-cape-fear",
            "title": "Cape Fear basin",
            "layer_group": "emerging",
            "evidence_type": "direct_measurement",
            "longitude": -78.8,
            "latitude": 34.2,
            "intensity": 0.87,
        },
        {
            "signal_id": "signal-great-lakes",
            "title": "Lower Great Lakes",
            "layer_group": "wildlife",
            "evidence_type": "screening_signal",
            "longitude": -79.4,
            "latitude": 43.3,
            "intensity": 0.63,
        },
    ]

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    pd.DataFrame(rows).to_csv(OUTPUT, index=False)
    print(f"Wrote demo layer scaffold to {OUTPUT}")


if __name__ == "__main__":
    main()
