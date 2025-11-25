import importlib
mods = [
  "app.ml.models.base",
  "app.ml.models.prediction",
  "app.ml.preprocessing.features",
  "app.ml.utils.fx",
]
for m in mods:
    print(f"Importing {m}...")
    importlib.import_module(m)
print("OK imports intra-ml")
