import {IUser} from "../models/User";

export type IUserForToken = Pick<IUser, 'password' | 'email' | "age" | "address" | 'firstName' | "id" | 'lastName'>;


