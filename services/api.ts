
import { supabase } from './supabaseClient';
import { Project, User, Sale, SaleItem, Reminder, GlobalNotification, ChatMessage, SaleStatus, ServiceType, TaskType, ItemStatus } from '../types';

// Helper to construct nested Project data from flat DB tables
export const api = {
  // --- FETCH DATA ---
  async fetchAll() {
    try {
      // Parallel fetch for efficiency
      const [
        { data: projectsData },
        { data: salesData },
        { data: itemsData },
        { data: assignmentsData },
        { data: remindersData },
        { data: usersData },
        { data: notificationsData },
        { data: messagesData }
      ] = await Promise.all([
        supabase.from('projects').select('*').order('created_at', { ascending: false }),
        supabase.from('sales').select('*').order('lead_date', { ascending: false }),
        supabase.from('sale_items').select('*'),
        supabase.from('sale_assignments').select('*'),
        supabase.from('reminders').select('*'),
        supabase.from('users').select('*'),
        supabase.from('notifications').select('*').order('created_at', { ascending: false }),
        supabase.from('chat_messages').select('*').order('created_at', { ascending: true })
      ]);

      // Reconstruct Users
      const users: User[] = (usersData || []).map(u => ({
        id: u.id,
        username: u.username,
        password: u.password,
        name: u.name,
        role: u.role,
        createdAt: u.created_at
      }));

      // Map Sales
      const salesMap = new Map<string, Sale>();
      
      (salesData || []).forEach(s => {
        // Find items for this sale
        const sItems: SaleItem[] = (itemsData || [])
          .filter(i => i.sale_id === s.id)
          .map(i => ({
            name: i.name,
            isPaid: i.is_paid,
            status: i.status as ItemStatus,
            type: i.type as TaskType,
            description: i.description,
            attachments: i.attachments || []
          }));

        // Find assignments
        const sWorkerIds = (assignmentsData || [])
          .filter(a => a.sale_id === s.id)
          .map(a => a.user_id);

        // Find reminders
        const sReminders: Reminder[] = (remindersData || [])
          .filter(r => r.sale_id === s.id)
          .map(r => ({
            id: r.id,
            date: r.date,
            note: r.note,
            isCompleted: r.is_completed
          }));

        const sale: Sale = {
          id: s.id,
          sequenceNumber: s.sequence_number,
          clientName: s.client_name,
          phoneNumber: s.phone_number,
          serviceType: s.service_type as ServiceType,
          status: s.status as SaleStatus,
          price: s.price,
          quantity: s.quantity,
          leadDate: s.lead_date,
          sentDate: s.sent_date,
          notes: s.notes,
          teamInstructions: s.team_instructions,
          hasClientModifications: s.has_client_modifications,
          items: sItems,
          assignedWorkerIds: sWorkerIds,
          reminders: sReminders
        };
        salesMap.set(s.id, sale);
      });

      // Map Projects
      const projects: Project[] = (projectsData || []).map(p => {
        // Filter sales belonging to this project
        const pClients = (salesData || [])
          .filter(s => s.project_id === p.id)
          .map(s => salesMap.get(s.id)!)
          .filter(Boolean); // safety check

        return {
          id: p.id,
          name: p.name,
          description: p.description,
          cost: p.cost,
          createdAt: p.created_at,
          clients: pClients
        };
      });

      // Map Notifications
      const notifications: GlobalNotification[] = (notificationsData || []).map(n => ({
        id: n.id,
        targetUserId: n.target_user_id,
        fromUserName: n.from_user_name,
        message: n.message,
        date: n.created_at,
        isRead: n.is_read,
        type: n.type
      }));

      // Map Chat
      const messages: ChatMessage[] = (messagesData || []).map(m => ({
        id: m.id,
        senderId: m.sender_id,
        receiverId: m.receiver_id,
        text: m.text,
        timestamp: m.created_at,
        read: m.is_read
      }));

      return { projects, users, notifications, messages };

    } catch (err) {
      console.error("Error fetching data from Supabase:", err);
      return { projects: [], users: [], notifications: [], messages: [] };
    }
  },

  // --- PROJECTS ---
  async createProject(project: Project) {
    // Changed to upsert to support imports and updates safely
    const { error } = await supabase.from('projects').upsert({
      id: project.id,
      name: project.name,
      cost: project.cost,
      created_at: project.createdAt
    });
    if (error) console.error(error);
  },

  async updateProject(project: Project) {
    const { error } = await supabase.from('projects').update({
      name: project.name,
      cost: project.cost
    }).eq('id', project.id);
    if (error) console.error(error);
  },

  async deleteProject(id: string) {
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) console.error(error);
  },

  // --- SALES (CLIENTS) ---
  // This function saves a sale and all its sub-entities (items, reminders, assignments)
  async saveSale(projectId: string, sale: Sale) {
    // 1. Upsert Sale
    const { error: saleError } = await supabase.from('sales').upsert({
      id: sale.id,
      project_id: projectId,
      client_name: sale.clientName,
      phone_number: sale.phoneNumber,
      service_type: sale.serviceType,
      status: sale.status,
      price: sale.price,
      quantity: sale.quantity,
      lead_date: sale.leadDate,
      sent_date: sale.sentDate,
      team_instructions: sale.teamInstructions,
      has_client_modifications: sale.hasClientModifications,
      // preserve sequence_number if it exists/auto-gen handled by DB default
    });
    if (saleError) return console.error('Error saving sale:', saleError);

    // 2. Sync Items (Strategy: Delete all for this sale and re-insert to handle order/changes easily)
    // Note: In production, better diffing is recommended, but this guarantees consistency for now.
    await supabase.from('sale_items').delete().eq('sale_id', sale.id);
    
    if (sale.items.length > 0) {
      const itemsPayload = sale.items.map(i => ({
        sale_id: sale.id,
        name: i.name,
        is_paid: i.isPaid,
        status: i.status,
        type: i.type,
        description: i.description,
        attachments: i.attachments
      }));
      const { error: itemsError } = await supabase.from('sale_items').insert(itemsPayload);
      if (itemsError) console.error('Error saving items:', itemsError);
    }

    // 3. Sync Assignments
    await supabase.from('sale_assignments').delete().eq('sale_id', sale.id);
    if (sale.assignedWorkerIds && sale.assignedWorkerIds.length > 0) {
      const assignPayload = sale.assignedWorkerIds.map(uid => ({
        sale_id: sale.id,
        user_id: uid
      }));
      await supabase.from('sale_assignments').insert(assignPayload);
    }

    // 4. Sync Reminders
    if (sale.reminders) {
        for (const r of sale.reminders) {
            await supabase.from('reminders').upsert({
                id: r.id,
                sale_id: sale.id,
                date: r.date,
                note: r.note,
                is_completed: r.isCompleted
            });
        }
    }
  },

  async deleteSale(id: string) {
    const { error } = await supabase.from('sales').delete().eq('id', id);
    if (error) console.error(error);
  },

  async deleteReminder(id: string) {
      await supabase.from('reminders').delete().eq('id', id);
  },

  // --- USERS ---
  async createUser(user: User) {
    const { error } = await supabase.from('users').insert({
      id: user.id,
      username: user.username,
      password: user.password,
      name: user.name,
      role: user.role,
      created_at: user.createdAt
    });
    if (error) console.error(error);
  },

  async deleteUser(id: string) {
    const { error } = await supabase.from('users').delete().eq('id', id);
    if (error) console.error(error);
  },

  // --- NOTIFICATIONS & CHAT ---
  async sendNotification(n: GlobalNotification) {
    const { error } = await supabase.from('notifications').insert({
      id: n.id,
      target_user_id: n.targetUserId,
      from_user_name: n.fromUserName,
      message: n.message,
      type: n.type,
      is_read: n.isRead,
      created_at: n.date
    });
    if (error) console.error(error);
  },

  async markNotificationRead(id: string) {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
  },

  async sendMessage(m: ChatMessage) {
    const { error } = await supabase.from('chat_messages').insert({
      id: m.id,
      sender_id: m.senderId,
      receiver_id: m.receiverId,
      text: m.text,
      is_read: m.read,
      created_at: m.timestamp
    });
    if (error) console.error(error);
  },

  async markMessagesRead(senderId: string, receiverId: string) {
    await supabase.from('chat_messages')
      .update({ is_read: true })
      .eq('sender_id', senderId)
      .eq('receiver_id', receiverId);
  }
};
