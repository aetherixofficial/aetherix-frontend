import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';

// Адреса контрактов (из твоего деплоя)
const AETX_ADDRESS = "0x7CbE925f90f60236885Ee1B73a78641bC6FAA9cF";
const STAKING_ADDRESS = "0xf09A1Fea8e143e0973A954Bcaffa5b442205fEaa";

// ABI токена AETX (минимальный)
const AETX_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function approve(address,uint256) returns (bool)"
];

// ABI Staking
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

  // Подключение кошелька
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

  // Добавить сеть Arbitrum Sepolia
  const addArbitrumSepolia = async () => {
    if (!window.ethereum) {
      alert("Please install MetaMask!");
      return;
    }

    try {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: '0x66eee', // 421614 в hex
          chainName: 'Arbitrum Sepolia',
          nativeCurrency: {
            name: 'SepoliaETH',
            symbol: 'ETH',
            decimals: 18,
          },
          rpcUrls: ['https://sepolia-rollup.arbitrum.io/rpc'],
          blockExplorerUrls: ['https://sepolia.arbiscan.io'],
        }],
      });
    } catch (error) {
      console.error("Failed to add network:", error);
      alert("Failed to add Arbitrum Sepolia. Please add it manually in MetaMask.");
    }
  };

  // Получение данных
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

  // Стейк
  const handleStake = async (amount) => {
    if (!signer || !amount) return;

    try {
      const aetxContract = new ethers.Contract(AETX_ADDRESS, AETX_ABI, signer);
      const stakingContract = new ethers.Contract(STAKING_ADDRESS, STAKING_ABI, signer);

      // Approve
      const tx1 = await aetxContract.approve(STAKING_ADDRESS, ethers.parseEther(amount));
      await tx1.wait();

      // Stake
      const tx2 = await stakingContract.stake(ethers.parseEther(amount));
      await tx2.wait();

      fetchData();
    } catch (err) {
      console.error("Stake error:", err);
      alert("Staking failed. Make sure you have enough AETX and approved the transaction.");
    }
  };

  // Claim
  const handleClaim = async () => {
    if (!signer) return;

    try {
      const stakingContract = new ethers.Contract(STAKING_ADDRESS, STAKING_ABI, signer);
      const tx = await stakingContract.claimRewards();
      await tx.wait();
      fetchData();
    } catch (err) {
      console.error("Claim error:", err);
      alert("Claim failed. Try again later.");
    }
  };

  useEffect(() => {
    if (account) fetchData();
  }, [account, fetchData]);

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif", maxWidth: "600px", margin: "0 auto" }}>
      {/* Логотип */}
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
            style={{ 
              marginTop: "10px", 
              padding: "8px 16px", 
              fontSize: "14px", 
              backgroundColor: "#f0f0f0", 
              border: "1px solid #ccc",
              cursor: "pointer"
            }}
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