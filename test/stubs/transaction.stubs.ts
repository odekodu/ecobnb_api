import { TransactableEnum } from "../../src/domains/transactions/dto/transactable.enum";
import { Transaction } from "../../src/domains/transactions/entities/transaction.entity";
import { CreateTransactionDto } from "../../src/domains/transactions/dto/create-transaction.dto";

export const createTransactionStub = (item: string, transactable = TransactableEnum.RENT): CreateTransactionDto => ({
  amount: 5000,
  from: '0x5B38Da6a701c568545dCfcB03FcB875f56beddC4',
  to: '0xAb8483F64d9C6d1EcF9b849Ae677dD3315835cb2',
  transactable,
  item,
  platform: 'Paystack',
  reference: 1
});

export const transactionStub: Partial<Transaction> = {
  amount: 5000,
  from: '0x5B38Da6a701c568545dCfcB03FcB875f56beddC4',
  to: '0xAb8483F64d9C6d1EcF9b849Ae677dD3315835cb2',
  transactable: TransactableEnum.RENT,
  platform: 'Paystack',
  reference: 1,
}
