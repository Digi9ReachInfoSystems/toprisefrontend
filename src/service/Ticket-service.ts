import apiClient from "@/apiClient";
import { TicketResponse } from "@/types/Ticket-types";
import { date } from "zod";
import { id } from "zod/v4/locales";


export const getTickets = async (): Promise<TicketResponse> => {
    try{
        const response = await apiClient.get("/orders/api/tickets")
        return response.data
    }
    catch(err:any){
        console.log("error in get tickets",err)
        throw err
    }
}

export const getTicketById = async (ticketId: string): Promise<TicketResponse> => {
    try{
        const response = await apiClient.get(`/orders/api/tickets/byId/${ticketId}`)
        return response.data
    }
    catch(err:any){
        console.log("error in get ticket by id",err)
        throw err
    }
}
export const statusUpdate = async (ticketId: string, statusData: {
    status: string;
    admin_notes: string;
    updated_by: string;
}): Promise<TicketResponse> => {
    try{
        const response = await apiClient.patch(`/orders/api/tickets/updateStatus/${ticketId}`, statusData)
        return response.data
    }
    catch(err:any){
        console.log("error in status update",err)
        throw err
    }
}

export async function getTicketByUser(userRef: string): Promise<TicketResponse> {
    try{
        const response = await apiClient.get(`/orders/api/tickets/byUser/${userRef}`)
        return response.data
    }
    catch(err:any){
        console.log("error in get ticket by user",err)
        throw err
    }
}