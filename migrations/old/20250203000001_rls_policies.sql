-- Users policies
create policy "Users can view their own profile"
  on public.users for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.users for update
  using (auth.uid() = id);

-- Carrier profiles policies
create policy "Carriers can view their own profile"
  on public.carrier_profiles for select
  using (auth.uid() = user_id);

create policy "Carriers can update their own profile"
  on public.carrier_profiles for update
  using (auth.uid() = user_id);

create policy "Everyone can view active carrier profiles"
  on public.carrier_profiles for select
  using (status = 'active');

-- Carrier vehicles policies
create policy "Carriers can manage their own vehicles"
  on public.carrier_vehicles for all
  using (
    exists (
      select 1 from public.carrier_profiles
      where id = carrier_vehicles.carrier_id
      and user_id = auth.uid()
    )
  );

create policy "Everyone can view carrier vehicles"
  on public.carrier_vehicles for select
  using (true);

-- Loads policies
create policy "Shippers can manage their own loads"
  on public.loads for all
  using (shipper_id = auth.uid());

create policy "Carriers can view assigned loads"
  on public.loads for select
  using (carrier_id = auth.uid());

create policy "Everyone can view pending loads"
  on public.loads for select
  using (status = 'pending');

-- Quotes policies
create policy "Carriers can manage their own quotes"
  on public.quotes for all
  using (
    exists (
      select 1 from public.carrier_profiles
      where id = quotes.carrier_id
      and user_id = auth.uid()
    )
  );

create policy "Load owners can view quotes"
  on public.quotes for select
  using (
    exists (
      select 1 from public.loads
      where id = quotes.load_id
      and shipper_id = auth.uid()
    )
  );

-- Shipments policies
create policy "Shippers can view their shipments"
  on public.shipments for select
  using (
    exists (
      select 1 from public.loads
      where id = shipments.load_id
      and shipper_id = auth.uid()
    )
  );

create policy "Carriers can view and update their shipments"
  on public.shipments for all
  using (
    exists (
      select 1 from public.carrier_profiles
      where id = shipments.carrier_id
      and user_id = auth.uid()
    )
  );

-- Documents policies
create policy "Document owners can manage their documents"
  on public.documents for all
  using (uploaded_by = auth.uid());

create policy "Shipment participants can view documents"
  on public.documents for select
  using (
    exists (
      select 1 from public.shipments s
      join public.loads l on s.load_id = l.id
      where s.id = documents.shipment_id
      and (l.shipper_id = auth.uid() or s.carrier_id = (
        select id from public.carrier_profiles where user_id = auth.uid()
      ))
    )
  );

-- Messages policies
create policy "Message participants can view their messages"
  on public.messages for select
  using (sender_id = auth.uid() or recipient_id = auth.uid());

create policy "Users can send messages"
  on public.messages for insert
  with check (sender_id = auth.uid());

create policy "Message senders can update status"
  on public.messages for update
  using (sender_id = auth.uid())
  with check (
    -- Only allow updating the status field
    coalesce(
      (akeys(to_jsonb(messages.*) - array['status', 'updated_at']))::text[] <@ 
      (akeys(to_jsonb(old.*)))::text[],
      true
    )
  );

-- Notifications policies
create policy "Users can view their own notifications"
  on public.notifications for select
  using (user_id = auth.uid());

create policy "Users can update their notification read status"
  on public.notifications for update
  using (user_id = auth.uid())
  with check (
    -- Only allow updating the read field
    coalesce(
      (akeys(to_jsonb(notifications.*) - array['read']))::text[] <@ 
      (akeys(to_jsonb(old.*)))::text[],
      true
    )
  );
