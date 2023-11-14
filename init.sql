-- Create User table
CREATE TABLE public.User (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL
);

-- Create Org table
CREATE TABLE public.Org (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL
);

-- Create Member table
CREATE TABLE public.Member (
    id SERIAL PRIMARY KEY,
    user_id INT,
    org_id INT,
    type VARCHAR(255) NOT NULL,
    FOREIGN KEY (org_id) REFERENCES public.Org(id),
    FOREIGN KEY (user_id) REFERENCES public.User(id)
);

-- Create Notification table
    CREATE TABLE public.Notification (
        id SERIAL PRIMARY KEY,
        sender_id INT,
        receiver_id INT,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        message TEXT,
        FOREIGN KEY (sender_id) REFERENCES public.Member(id),
        FOREIGN KEY (receiver_id) REFERENCES public.Member(id)
    );

-- Create Leave table
CREATE TABLE public.Leave (
    id SERIAL PRIMARY KEY,
    sender_id INT,
    receiver_id INT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT,
    FOREIGN KEY (sender_id) REFERENCES public.Member(id),
    FOREIGN KEY (receiver_id) REFERENCES public.Member(id)
);

CREATE TABLE ConnectorConfigurations (
    id SERIAL PRIMARY KEY,
    connector_name VARCHAR(255) NOT NULL,
    table_name TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample data into User table
INSERT INTO public.User (name) VALUES ('baski'), ('kums'), ('ravi');

-- Insert sample data into Org table
INSERT INTO public.Org (name) VALUES ('crayond');

-- Insert sample data into Member table
INSERT INTO public.Member (user_id, org_id, type) VALUES
(1, 1, 'manager'),
(2, 1, 'lead'),
(3, 1, 'employee');

-- Insert sample data into Leave table
-- INSERT INTO public.Leave (sender_id, receiver_id, start_date, end_date, reason) VALUES
-- (3, 2, '2023-11-15', '2023-11-17', 'Fever');

