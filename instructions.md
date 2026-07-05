dotnet publish /p:PublishProfile=DefaultContainer

az login --use-device-code

az account list-locations -o table

export LOCATION=japaneast
export RESOURCE_GROUP=rg-eshop
export CLUSTER_NAME=aks-eshop
export ACR_NAME=acseshop$SRANDOM


az group create --name $RESOURCE_GROUP --location $LOCATION
az acr create --resource-group $RESOURCE_GROUP --name $ACR_NAME --sku Basic
az acr login --name $ACR_NAME



docker tag store $ACR_NAME.azurecr.io/storeimage:v1
docker tag products $ACR_NAME.azurecr.io/productservice:v1

docker push $ACR_NAME.azurecr.io/storeimage:v1
docker push $ACR_NAME.azurecr.io/productservice:v1


az aks create \
  --resource-group $RESOURCE_GROUP \
  --name $CLUSTER_NAME \
  --node-count 1 \
  --generate-ssh-keys \
  --node-vm-size standard_b2as_v2 \
  --network-plugin azure \
  --attach-acr $ACR_NAME

az aks get-credentials --name $CLUSTER_NAME --resource-group $RESOURCE_GROUP

az aks check-acr --acr $ACR_NAME.azurecr.io --name $CLUSTER_NAME --resource-group $RESOURCE_GROUP

kubectl get nodes -A

kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.9.3/deploy/static/provider/cloud/deploy.yaml

kubectl get services --namespace ingress-nginx

kubectl apply -f deployment.yml

kubectl get pods

echo "http://$(kubectl get services --namespace ingress-nginx ingress-nginx-controller --output jsonpath='{.status.loadBalancer.ingress[0].ip}')"

-------------------------------------------------------------------------
export SUBS=$(az account show --query 'id' --output tsv)

az ad sp create-for-rbac --name "eShop" --role contributor --scopes /subscriptions/$SUBS/resourceGroups/$RESOURCE_GROUP --json-auth

-------------------------------------------------------------------------
export ACR=acseshop1129911899
az acr repository show-tags -n $ACR --repository productservice --orderby time_desc --output table

az acr repository show-tags -n $ACR --repository productservice --orderby time_desc --output table