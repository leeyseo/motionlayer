# Motion Layer design previews

Each concept is deployed to its own Firebase Hosting site in the existing `fenno-state-ss27` project.

| Concept | Source | Firebase target | Site |
| --- | --- | --- | --- |
| Fenno State | `fenno-preview/` | `state` | https://fenno-state-ss27.web.app |
| Fenno Index | `fenno-index/` | `index` | https://fenno-index-ss27.web.app |
| Fenno Lookbook | `fenno-highlight/` | `lookbook` | https://fenno-lookbook-ss27.web.app |
| Saga | `motionlayer-saga/dist/` | `motionlayer-saga` | https://motionlayer-saga-ss27.web.app |
| Womenswear — The Soft Edit | `motionlayer-womenswear/dist/` | `motionlayer-womenswear` | https://motionlayer-soft-edit-ss27.web.app |
| Cascade | `motionlayer-cascade/dist/` | `motionlayer-cascade` | https://motionlayer-cascade-ss27.web.app |
| Garment Index | `motionlayer-index/dist/` | `motionlayer-index` | https://motionlayer-index-ss27.web.app |

The four Motion Layer previews are buildless HTML, CSS, and JavaScript sites. Their `dist/` folders include the images and fonts needed for hosting. Supporting tools and asset source notes are kept alongside each preview.

## Deploy the four Motion Layer previews

From this repository, after signing into Firebase:

```sh
npx firebase-tools deploy --project fenno-state-ss27 --only hosting:motionlayer-saga,hosting:motionlayer-womenswear,hosting:motionlayer-cascade,hosting:motionlayer-index
```

To update just one preview, specify its target, for example:

```sh
npx firebase-tools deploy --project fenno-state-ss27 --only hosting:motionlayer-cascade
```

These storefronts are design previews with sample product data. Checkout and external commerce services are not connected.
