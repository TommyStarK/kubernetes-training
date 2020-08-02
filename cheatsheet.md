Display containers name in a pod selected by label

```bash
❯ kubectl get pods --all-namespaces -l <LABEL_NAME>=<LABEL_VALUE> -o jsonpath="{.items[*].spec.containers[*].name}" | tr " " "\n"; echo
```

Display containers image in a pod selected by label

```bash
❯ kubectl get pods --all-namespaces -l <LABEL_NAME>=<LABEL_VALUE> -o jsonpath="{.items[*].spec.containers[*].image}" | tr " " "\n"; echo
```

list every instance of every resource type in a namespace

```bash
❯ kubectl api-resources --verbs=list --namespaced -o name \
  | xargs -n 1 kubectl get --show-kind --ignore-not-found -l <label>=<value> -n <namespace>
```

list everything

```bash
❯ kubectl api-resources --verbs=list  -o name | xargs -n 1 kubectl get --show-kind -A 2>/dev/nul
```
