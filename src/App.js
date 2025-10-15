import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';

// Адреса контрактов (Arbitrum Sepolia)
const AETX_ADDRESS = "0x74d08675d7425236FDe13D54e3a5f0c5708132A8";
const STAKING_ADDRESS = "0x663674F87471c5Ba2b63eCF8AcAD0aE5767966A6";

const AETX_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function approve(address,uint256) returns (bool)",
  "function claimTestTokens()"
];

const STAKING_ABI = [
  "function stake(uint256)",
  "function claimRewards()",
  "function myStake() view returns (uint256)",
  "function pendingReward(address) view returns (uint256)"
];

function App() {
  const [signer, setSigner] = useState(null);
  const [account, setAccount] = useState(null);
  const [aetxBalance, setAetxBalance] = useState("0");
  const [staked, setStaked] = useState("0");
  const [pendingReward, setPendingReward] = useState("0");

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("Please install MetaMask!");
      return;
    }
    try {
      await window.ethereum.request({ method: "eth_requestAccounts" });
      const prov = new ethers.BrowserProvider(window.ethereum);
      const sign = await prov.getSigner();
      const addr = await sign.getAddress();
      setSigner(sign);
      setAccount(addr);
    } catch (err) {
      console.error(err);
    }
  };

  const addArbitrumSepolia = async () => {
    if (!window.ethereum) {
      alert("Please install MetaMask!");
      return;
    }
    try {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: '0x66eee',
          chainName: 'Arbitrum Sepolia',
          nativeCurrency: { name: 'SepoliaETH', symbol: 'ETH', decimals: 18 },
          rpcUrls: ['https://sepolia-rollup.arbitrum.io/rpc'],
          blockExplorerUrls: ['https://sepolia.arbiscan.io'],
        }],
      });
    } catch (error) {
      console.error("Failed to add network:", error);
      alert("Failed to add Arbitrum Sepolia. Please add it manually.");
    }
  };

  const getTestAETX = async () => {
    if (!signer) {
      alert("Connect wallet first");
      return;
    }
    try {
      const aetx = new ethers.Contract(AETX_ADDRESS, AETX_ABI, signer);
      const tx = await aetx.claimTestTokens();
      await tx.wait();
      alert("✅ 1000 AETX received!");
      fetchData();
    } catch (err) {
      console.error(err);
      alert("Failed to get AETX. Maybe you already claimed?");
    }
  };

  const fetchData = useCallback(async () => {
    if (!signer || !account) return;
    try {
      const aetxContract = new ethers.Contract(AETX_ADDRESS, AETX_ABI, signer);
      const stakingContract = new ethers.Contract(STAKING_ADDRESS, STAKING_ABI, signer);

      const balance = await aetxContract.balanceOf(account);
      const stake = await stakingContract.myStake();
      const reward = await stakingContract.pendingReward(account);

      setAetxBalance(ethers.formatEther(balance));
      setStaked(ethers.formatEther(stake));
      setPendingReward(ethers.formatEther(reward));
    } catch (err) {
      console.error("Fetch error:", err);
    }
  }, [signer, account]);

  const handleStake = async (amount) => {
    if (!signer || !amount) return;
    try {
      const aetxContract = new ethers.Contract(AETX_ADDRESS, AETX_ABI, signer);
      const stakingContract = new ethers.Contract(STAKING_ADDRESS, STAKING_ABI, signer);

      const tx1 = await aetxContract.approve(STAKING_ADDRESS, ethers.parseEther(amount));
      await tx1.wait();

      const tx2 = await stakingContract.stake(ethers.parseEther(amount));
      await tx2.wait();

      fetchData();
    } catch (err) {
      console.error("Stake error:", err);
      alert("Staking failed. Check balance and approvals.");
    }
  };

  const handleClaim = async () => {
    if (!signer) return;
    try {
      const stakingContract = new ethers.Contract(STAKING_ADDRESS, STAKING_ABI, signer);
      const tx = await stakingContract.claimRewards();
      await tx.wait();
      fetchData();
    } catch (err) {
      console.error("Claim error:", err);
      alert("Claim failed.");
    }
  };

  useEffect(() => {
    if (account) fetchData();
  }, [account, fetchData]);

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif", maxWidth: "600px", margin: "0 auto" }}>
      <img 
        src="/logo.jpg" 
        alt="Aetherix Logo" 
        style={{ width: "150px", marginBottom: "1rem", borderRadius: "8px" }}
      />
      <h1>🌌 Aetherix</h1>
      <p>Stake AETX → Earn USDT (5% APY)</p>

      {!account ? (
        <div>
          <button onClick={connectWallet} style={{ padding: "10px 20px", fontSize: "16px" }}>
            Connect Wallet
          </button>
          <br />
          <button 
            onClick={addArbitrumSepolia} 
            style={{ marginTop: "10px", padding: "8px 16px", fontSize: "14px", backgroundColor: "#f0f0f0", border: "1px solid #ccc" }}
          >
            Add Arbitrum Sepolia Network
          </button>
        </div>
      ) : (
        <div>
          <p>Account: {account.slice(0, 6)}...{account.slice(-4)}</p>
          <p>AETX Balance: {parseFloat(aetxBalance).toFixed(2)}</p>
          <p>Staked: {parseFloat(staked).toFixed(2)}</p>
          <p>Pending Reward: {parseFloat(pendingReward).toFixed(6)} USDT</p>

          {parseFloat(aetxBalance) < 100 && (
            <button 
              onClick={getTestAETX}
              style={{ marginTop: "10px", padding: "8px 16px", backgroundColor: "#e6f7ff", border: "1px solid #91d5ff" }}
            >
              🆓 Get 1000 Test AETX
            </button>
          )}

          <div style={{ marginTop: "1rem" }}>
            <input id="stake-amount" placeholder="Amount to stake (AETX)" style={{ padding: "8px", marginRight: "8px" }} />
            <button onClick={() => handleStake(document.getElementById("stake-amount").value)}>
              Stake AETX
            </button>
          </div>

          <button 
            onClick={handleClaim} 
            style={{ marginTop: "1rem", padding: "10px 20px" }}
          >
            Claim USDT Rewards
          </button>
        </div>
      )}
    </div>
  );
}

export default App;