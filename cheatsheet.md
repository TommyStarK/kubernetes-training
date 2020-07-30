Display containers name in a pod selected by label

```bash
❯ kubectl get pods --all-namespaces -l <LABEL_NAME>=<LABEL_VALUE> -o jsonpath="{.items[*].spec.containers[*].name}" | tr " " "\n"; echo
```

Display containers image in a pod selected by label

```bash
❯ kubectl get pods --all-namespaces -l <LABEL_NAME>=<LABEL_VALUE> -o jsonpath="{.items[*].spec.containers[*].image}" | tr " " "\n"; echo
```
