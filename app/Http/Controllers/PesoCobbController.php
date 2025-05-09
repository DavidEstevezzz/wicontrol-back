<?php

namespace App\Http\Controllers;

use App\Models\PesoCobb;
use Illuminate\Http\Request;

class PesoCobbController extends Controller
{
    public function index()
    {
        return response()->json(PesoCobb::all());
    }

    public function show($id)
    {
        return response()->json(PesoCobb::findOrFail($id));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'edad'    => 'nullable|integer',
            'Mixto'   => 'nullable|integer',
            'Machos'  => 'nullable|integer',
            'Hembras' => 'nullable|integer',
        ]);

        $item = PesoCobb::create($validated);
        return response()->json($item, 201);
    }

    public function update(Request $request, $id)
    {
        $item = PesoCobb::findOrFail($id);

        $validated = $request->validate([
            'edad'    => 'nullable|integer',
            'Mixto'   => 'nullable|integer',
            'Machos'  => 'nullable|integer',
            'Hembras' => 'nullable|integer',
        ]);

        $item->update($validated);
        return response()->json($item);
    }

    public function destroy($id)
    {
        PesoCobb::destroy($id);
        return response()->json(null, 204);
    }
}
