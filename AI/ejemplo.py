#Aca esta el codigo de la red neuronal que hicimos en bioinfo

import pandas as pd
import numpy as np
import torch
from torch.utils.data import Dataset, DataLoader
import torch.nn as nn
import torch.nn.functional as F
import torch.optim as optim

batch_size = 64
learning_rate = 1e-3
epochs = 5

class genomic_sequences_dataset(Dataset):
    def __init__(self, dataset_file, train=False):
        self.dataset = pd.read_csv(dataset_file)
        sequences = np.array(self.dataset["padded_sequences"].tolist())
        labels = np.array(self.dataset["value"].tolist(), dtype=np.float32)
        split_idx = int(0.8 * len(sequences))
        if train:
            self.x_data = sequences[:split_idx]
            self.y_data = labels[:split_idx]
        else:
            self.x_data = sequences[split_idx:]
            self.y_data = labels[split_idx:]

    def dna_one_hot(self, seq):
        mapping = {'A':0,'C':1,'G':2,'T':3}
        one_hot = np.zeros((4,len(seq)), dtype=np.float32)
        for i, nucleotide in enumerate(seq):
            if nucleotide in mapping:
                one_hot[mapping[nucleotide],i] = 1.0
        return torch.tensor(one_hot)

    def __getitem__(self, idx):
        sequence = self.dna_one_hot(self.x_data[idx])
        label = torch.tensor(self.y_data[idx], dtype=torch.float)
        return sequence, label

    def __len__(self):
        return len(self.x_data)

def collate_fn(batch):
    sequences, labels = zip(*batch)
    max_len = max([s.shape[1] for s in sequences])
    padded_sequences = []
    for s in sequences:
        pad_size = max_len - s.shape[1]
        if pad_size > 0:
            pad = torch.zeros((4,pad_size), dtype=s.dtype)
            s = torch.cat([s,pad], dim=1)
        padded_sequences.append(s)
    sequences_tensor = torch.stack(padded_sequences)
    labels_tensor = torch.tensor(labels).unsqueeze(1)
    return sequences_tensor, labels_tensor

train_dataset = genomic_sequences_dataset("genomic_sequences.csv", train=True)
test_dataset = genomic_sequences_dataset("genomic_sequences.csv", train=False)

train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True, collate_fn=collate_fn)
test_loader = DataLoader(test_dataset, batch_size=batch_size, shuffle=False, collate_fn=collate_fn)

class GenomicCNN(nn.Module):
    def __init__(self, in_channels=4, out_channels=16, fc_hidden=64):
        super().__init__()
        self.conv1 = nn.Conv1d(in_channels, out_channels, kernel_size=5)
        self.pool = nn.AdaptiveMaxPool1d(1)
        self.flatten = nn.Flatten(start_dim=1)
        self.fc1 = nn.Linear(out_channels, fc_hidden)
        self.fc2 = nn.Linear(fc_hidden,1)

    def forward(self, x):
        x = self.pool(F.relu(self.conv1(x)))
        x = self.flatten(x)
        x = F.relu(self.fc1(x))
        y_hat = torch.sigmoid(self.fc2(x))
        return y_hat

model = GenomicCNN()
loss_fn = nn.BCELoss()
optimizer = optim.SGD(model.parameters(), lr=learning_rate)

def train_loop(dataloader, model, loss_fn, optimizer):
    model.train()
    for X, y in dataloader:
        pred = model(X)
        loss = loss_fn(pred, y)
        optimizer.zero_grad()
        loss.backward()
        optimizer.step()

def test_loop(dataloader, model, loss_fn):
    model.eval()
    size = len(dataloader.dataset)
    num_batches = len(dataloader)
    test_loss, correct = 0,0
    with torch.no_grad():
        for X, y in dataloader:
            pred = model(X)
            test_loss += loss_fn(pred, y).item()
            predicted = (pred>0.5).float()
            correct += (predicted==y).sum().item()
    test_loss /= num_batches
    accuracy = correct/size
    print(f"Accuracy: {accuracy*100:.1f}%, Avg loss: {test_loss:.6f}")

for t in range(epochs):
    print(f"\nEpoch {t+1}")
    train_loop(train_loader, model, loss_fn, optimizer)
    test_loop(test_loader, model, loss_fn)
print("Done!")
