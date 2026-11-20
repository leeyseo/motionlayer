# Motion Layer design previews

Each concept is deployed to its own Firebase Hosting site in the existing `fenno-state-ss27` project.

| Concept | Source | Firebase target | Site |
| --- | --- | --- | --- |
| Motion Layer State | `motionlayer-state/` | `state` | https://motionlayer-state-ss27.web.app |
| Motion Layer Product Index | `motionlayer-product-index/` | `index` | https://motionlayer-product-index-ss27.web.app |
| Motion Layer Lookbook | `motionlayer-lookbook/` | `lookbook` | https://motionlayer-lookbook-ss27.web.app |
| Saga | `motionlayer-saga/dist/` | `motionlayer-saga` | https://motionlayer-saga-ss27.web.app |
| Womenswear — The Soft Edit | `motionlayer-womenswear/dist/` | `motionlayer-womenswear` | https://motionlayer-soft-edit-ss27.web.app |
| Cascade | `motionlayer-cascade/dist/` | `motionlayer-cascade` | https://motionlayer-cascade-ss27.web.app |
| Garment Index | `motionlayer-index/dist/` | `motionlayer-index` | https://motionlayer-index-ss27.web.app |

All seven Motion Layer previews are buildless HTML, CSS, and JavaScript sites. Saga, Soft Edit, Cascade, and Garment Index keep their deployable files in `dist/`; State, Product Index, and Lookbook use their concept folder directly. The deployed folders include local images and fonts.

The former `fenno-*.web.app` and `fenno-*.firebaseapp.com` addresses redirect to the corresponding Motion Layer sites, preserving URL paths. The existing Firebase project ID remains `fenno-state-ss27`.

## Deploy State, Product Index, and Lookbook

```sh
npx firebase-tools deploy --project fenno-state-ss27 --only hosting:state,hosting:index,hosting:lookbook
```

To update redirects from the former addresses:

```sh
npx firebase-tools deploy --project fenno-state-ss27 --only hosting:legacy-state,hosting:legacy-index,hosting:legacy-lookbook
```

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
