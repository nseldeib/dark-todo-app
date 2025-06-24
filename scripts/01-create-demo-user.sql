-- Create demo user in auth.users table
-- Note: This requires admin privileges. If this fails, create the demo user through the sign-up page first.

-- Insert demo user into auth.users (this may require superuser privileges)
-- If you get permission errors, skip this and create the user through the app
DO $$
BEGIN
    -- Try to insert demo user into auth.users
    INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        recovery_sent_at,
        last_sign_in_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        email_change,
        email_change_token_new,
        recovery_token
    ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        gen_random_uuid(),
        'authenticated',
        'authenticated',
        'demo@todoapp.dev',
        crypt('DarkTodo2024!', gen_salt('bf')), -- This may not work without proper extensions
        NOW(),
        NOW(),
        NOW(),
        '{"provider":"email","providers":["email"]}',
        '{}',
        NOW(),
        NOW(),
        '',
        '',
        '',
        ''
    ) ON CONFLICT (email) DO NOTHING;
    
    RAISE NOTICE 'Demo user creation attempted. If this fails, please create the user through the sign-up page.';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Could not create demo user in auth.users. Please create manually through sign-up page.';
END $$;
