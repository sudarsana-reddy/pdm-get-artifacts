import fetch, { Headers } from 'node-fetch';

const PDM_BASEAPI_URL = `${process.env.PDM_BASEAPI_URL}`;
const AUTH_TOKEN_URL = `${PDM_BASEAPI_URL}/oauth2/v1/token`;

const PIPELINES_URL = `${PDM_BASEAPI_URL}/DeploymentManager/v1/pipelines`
const DEPLOYMENT_URL = `${PDM_BASEAPI_URL}/DeploymentManager/v1/deployments`;

const params = new URLSearchParams();
params.append("client_id", process.env.PDM_CLIENT_ID);
params.append("client_secret", process.env.PDM_CLIENT_SECRET);
params.append("grant_type", "client_credentials");

const pipelineIDs = ['Pipeline-3WSYF'];

async function runTask() {
    for (let pipelineID of pipelineIDs) {
        await getDeployments(pipelineID);
    }
}

async function getDeployments(pipelineID) {
    let headers = await getHeaders();
    let pipelineDeploymentsURL = `${PIPELINES_URL}/${pipelineID}/deployments`;
    let response = await fetch(pipelineDeploymentsURL, {
        method: 'GET',
        headers: headers
    });
    const responseJson = await response.json();
    let deploymentIds = [];
    responseJson.data.forEach(deploymentData => deploymentIds.push(deploymentData.deploymentID));
    console.log(deploymentIds);
    let deploymentProducts = [];
    for (let deploymentID of deploymentIds) {
        let productJson = await getDeploymentDataByDeploymentID(deploymentID);
        deploymentProducts.push(productJson);
    }
    console.table(deploymentProducts);

    let productsmap = new Map();
    for (let product of deploymentProducts) {
        if (product.status !== 'Resolved-Completed')
            continue;

        let deploymentNumber = parseInt(product.deploymentNumber.replaceAll('#', ''));
        let deploymentID = product.deploymentID;

        if (!productsmap.has(product.productName)) {
            productsmap.set(product.productName,
                {
                    'deploymentNumber': deploymentNumber,
                    'deploymentID': deploymentID
                });
        }
        else {
            let productData = productsmap.get(product.productName);
            let existingDeploymentNumber = productData.deploymentNumber;
            if (deploymentNumber > existingDeploymentNumber) {
                productsmap.set(product.productName,
                    {
                        'deploymentNumber': deploymentNumber,
                        'deploymentID': deploymentID
                    });
            }
        }
    }

    console.table(productsmap);
}

async function getDeploymentDataByDeploymentID(deploymentID) {
    let headers = await getHeaders();
    let deploymentDataURL = `${DEPLOYMENT_URL}/${deploymentID}`;
    let response = await fetch(deploymentDataURL, {
        method: 'GET',
        headers: headers
    });
    const responseJson = await response.json();
    let productJson = {
        'deploymentID': responseJson.deploymentID,
        'deploymentNumber': responseJson.deploymentNumber,
        'status': responseJson.status
    };
    for (let params of responseJson.pipelineObject.pipelineParameters) {
        if (params.name === 'productName') {
            productJson.productName = params.value;
            break;
        }
    }

    console.log(productJson);
    return productJson;
}

async function getHeaders() {
    let token = await getToken();
    const headers = new Headers();
    headers.append('Authorization', `Bearer ${token}`);
    return headers;
}

async function getToken() {
    let response = await fetch(AUTH_TOKEN_URL, {
        method: 'POST',
        body: params
    });
    const data = await response.json();
    return data.access_token;
}

async function insecurePassword() {
    // BAD: the random suffix is not cryptographically secure
    var suffix = Math.random();
    var password = "myPassword" + suffix;
    return password;
}

runTask();
