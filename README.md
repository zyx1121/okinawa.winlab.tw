# okinawa.winlab.tw

WinLab Okinawa trip dashboard. The app renders a checked-in itinerary JSON file on a Mapbox map with an ordered attraction list.

## Data

Trip data lives in `data/trip-attractions.json`. Update itinerary data by editing that file and committing the change through git; there is no runtime write API.

## Commands

```bash
bun install
bun run dev
bun test
bun run typecheck
bun run lint
bun run build
```

<!-- winfra-paas GitHub App CD verification 1783658887 -->

<!-- winfra-paas Deployments/Commit-Status write-back verification 1783665543 -->
