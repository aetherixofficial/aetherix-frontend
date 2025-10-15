// src/App.js
import React, { useState, useEffect } from 'react';
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
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [account, setAccount] = useState(null);
  const [aetxBalance, setAetxBalance] = useState("0");
  const [staked, setStaked] = useState("0");
  const [pendingReward, setPendingReward] = useState("0");

  // Подключение кошелька
  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        await window.ethereum.request({ method: "eth_requestAccounts" });
        const prov = new ethers.BrowserProvider(window.ethereum);
        const sign = await prov.getSigner();
        const addr = await sign.getAddress();

        setProvider(prov);
        setSigner(sign);
        setAccount(addr);

        // Переключи на Arbitrum Sepolia
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x66eee' }], // 421614 в hex
          });
        } catch (switchError) {
          if (switchError.code === 4902) {
            alert("Please add Arbitrum Sepolia network manually in MetaMask");
          }
        }
      } catch (err) {
        console.error(err);
      }
    } else {
      alert("Please install MetaMask!");
    }
  };

  // Получение данных
  const fetchData = async () => {
    if (!signer || !account) return;

    const aetxContract = new ethers.Contract(AETX_ADDRESS, AETX_ABI, signer);
    const stakingContract = new ethers.Contract(STAKING_ADDRESS, STAKING_ABI, signer);

    const balance = await aetxContract.balanceOf(account);
    const stake = await stakingContract.myStake();
    const reward = await stakingContract.pendingReward(account);

    setAetxBalance(ethers.formatEther(balance));
    setStaked(ethers.formatEther(stake));
    setPendingReward(ethers.formatEther(reward));
  };

  // Стейк
  const handleStake = async (amount) => {
    if (!signer) return;
    const aetxContract = new ethers.Contract(AETX_ADDRESS, AETX_ABI, signer);
    const stakingContract = new ethers.Contract(STAKING_ADDRESS, STAKING_ABI, signer);

    // Approve
    const tx1 = await aetxContract.approve(STAKING_ADDRESS, ethers.parseEther(amount));
    await tx1.wait();

    // Stake
    const tx2 = await stakingContract.stake(ethers.parseEther(amount));
    await tx2.wait();

    fetchData();
  };

  // Claim
  const handleClaim = async () => {
    if (!signer) return;
    const stakingContract = new ethers.Contract(STAKING_ADDRESS, STAKING_ABI, signer);
    const tx = await stakingContract.claimRewards();
    await tx.wait();
    fetchData();
  };

  useEffect(() => {
    if (account) fetchData();
  }, [account]);

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
        <button onClick={connectWallet} style={{ padding: "10px 20px", fontSize: "16px" }}>
          Connect Wallet
        </button>
      ) : (
        <div>
          <p>Account: {account.slice(0, 6)}...{account.slice(-4)}</p>
          <p>AETX Balance: {parseFloat(aetxBalance).toFixed(2)}</p>
          <p>Staked: {parseFloat(staked).toFixed(2)}</p>
          <p>Pending Reward: {parseFloat(pendingReward).toFixed(4)} USDT</p>

          <div style={{ marginTop: "1rem" }}>
            <input id="stake-amount" placeholder="Amount to stake" />
            <button onClick={() => handleStake(document.getElementById("stake-amount").value)}>
              Stake AETX
            </button>
          </div>

          <button onClick={handleClaim} style={{ marginTop: "1rem" }}>
            Claim USDT Rewards
          </button>
        </div>
      )}
    </div>
  );
}

export default App;