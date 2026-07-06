dotnet publish /p:PublishProfile=DefaultContainer

login in azure cli via device code
az login --use-device-code

# List all locations and code
az account list-locations -o table
# To get all the available regions applicable
Azure Portal > Policy > Assignments > Allowed resource deployment regions 

# To make a variable-like for use later
export LOCATION=japaneast
export RESOURCE_GROUP=rg-eshop
export CLUSTER_NAME=aks-eshop
export ACR_NAME=acseshop$SRANDOM

# To create resource group
az group create --name $RESOURCE_GROUP --location $LOCATION
# To create Azure Container Registry (ACR)
az acr create --resource-group $RESOURCE_GROUP --name $ACR_NAME --sku Basic
# To login into acr
az acr login --name $ACR_NAME


# To create alias for local image to push
docker tag store $ACR_NAME.azurecr.io/storeimage:v1
docker tag products $ACR_NAME.azurecr.io/productservice:v1

## push the actual image into acr
docker push $ACR_NAME.azurecr.io/storeimage:v1
docker push $ACR_NAME.azurecr.io/productservice:v1

# create the azure kubernetes service (aks)
az aks create \
  --resource-group $RESOURCE_GROUP \
  --name $CLUSTER_NAME \
  --node-count 1 \
  --generate-ssh-keys \
  --node-vm-size standard_b2as_v2 \
  --network-plugin azure \
  --attach-acr $ACR_NAME

# get credentials to aks
az aks get-credentials --name $CLUSTER_NAME --resource-group $RESOURCE_GROUP

# command to check if the new aks can pull images from acr
az aks check-acr --acr $ACR_NAME.azurecr.io --name $CLUSTER_NAME --resource-group $RESOURCE_GROUP

# check status of aks
kubectl get nodes -A

# deploy ingress nginx into the aks
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.9.3/deploy/static/provider/cloud/deploy.yaml

# check if ingress is ready
kubectl get services --namespace ingress-nginx

# deploy eShop app (FE + BE)
kubectl apply -f deployment.yml

# get deployments (blueprint/image)
kubectl get deployments

# get deployed services (instance/containers)
kubectl get pods

# get ip of the deployed service
echo "http://$(kubectl get services --namespace ingress-nginx ingress-nginx-controller --output jsonpath='{.status.loadBalancer.ingress[0].ip}')"

-------------------------------------------------------------------------
# get and save subcription id
export SUBS=$(az account show --query 'id' --output tsv)

# create rbac to allow access in github
az ad sp create-for-rbac --name "eShop" --role contributor --scopes /subscriptions/$SUBS/resourceGroups/$RESOURCE_GROUP --json-auth

-------------------------------------------------------------------------
# actual acr name
export ACR=acseshop1129911899
# show current versions of product service stored in acr
az acr repository show-tags -n $ACR --repository productservice --orderby time_desc --output table

------------------------------------------------------------------------------
# monitor service with watch 
kubectl get pods --selector=app=productservice --watch

# remove deployment / rollback
kubectl rollout undo deployment/productservice

-------------------------------------------------------------------------
# Lists all running container instances inside nginx
kubectl get pods -n ingress-nginx

# Retrieves the complete configuration blueprint and routing rules for the eshop-ingress  
kubectl get ingress eshop-ingress -o yaml