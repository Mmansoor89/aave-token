/**
 * @fileoverview Hardhat task to deploy the AaveToken contract using the Transparent Upgradeable Proxy standard.
 * This script deploys both the Implementation and the Proxy contract.
 */
import { task } from "hardhat/config"; // FIX: Use 'hardhat/config' instead of '@nomiclabs/buidler/config'
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { eContractid } from "../../helpers/types";
import {
    registerContractInJsonDb,
    deployAaveToken,
    deployInitializableAdminUpgradeabilityProxy,
} from "../../helpers/contracts-helpers";

const { AaveToken, AaveTokenImpl } = eContractid;

task(`deploy-${AaveToken}`, `Deploys the ${AaveToken} contract and its proxy implementation`)
    .addFlag("verify", "Proceed with the Etherscan verification")
    .addOptionalParam("admin", "The initial admin address for the proxy (optional)")
    .setAction(async ({ verify, admin }, hre: HardhatRuntimeEnvironment) => { // FIX: Renamed localBRE to hre
        
        // Removed localBRE.run("set-bre") - assumed to be handled by modern Hardhat setup
        
        if (!hre.network.config.chainId) {
            throw new Error("INVALID_CHAIN_ID: Network chainId is required for deployment tracking.");
        }

        console.log(`\n- ${AaveToken} deployment on network ${hre.network.name}`);

        // --- 1. DEPLOY IMPLEMENTATION (LOGIC CONTRACT) ---
        
        console.log(`\tDeploying ${AaveToken} implementation (${AaveTokenImpl}) ...`);
        const aaveTokenImpl = await deployAaveToken(verify);
        await registerContractInJsonDb(AaveTokenImpl, aaveTokenImpl);

        // --- 2. DEPLOY PROXY CONTRACT ---
        
        console.log(`\tDeploying ${AaveToken} Transparent Proxy ...`);
        // The admin param, if provided, should be passed here. Fallback to deployer address if needed.
        const proxyAdmin = admin || (await hre.ethers.getSigners())[0].address;

        const aaveTokenProxy = await deployInitializableAdminUpgradeabilityProxy(
            verify, 
            proxyAdmin, 
            aaveTokenImpl.address // Pass implementation address during proxy deployment
        );
        await registerContractInJsonDb(AaveToken, aaveTokenProxy);
        
        // --- 3. PROXY INITIALIZATION (CRITICAL STEP) ---
        
        console.log(`\n\tImplementation deployed at: ${aaveTokenImpl.address}`);
        console.log(`\tProxy deployed at: ${aaveTokenProxy.address}`);
        
        // NOTE: The proxy must be initialized with the implementation and initial configuration 
        // (e.g., name, symbol, initial supply, admin/owner) in a separate task, 
        // typically named 'initialize-AaveToken'.
        
        console.log(`\n\tFinished ${AaveToken} proxy and implementation deployment.`);
        console.log(`\tNEXT STEP: Run 'initialize-${AaveToken}' task to link the proxy to the implementation and set initial state.`);
    });
